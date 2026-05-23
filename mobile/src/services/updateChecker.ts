import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import type { DownloadResumable } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Alert, Platform } from 'react-native';
import {
  clearPendingUpdate,
  formatDownloadProgress,
  getUpdateUiSnapshot,
  loadPendingUpdate,
  savePendingUpdate,
  setUpdateUiSnapshot,
  type PendingUpdateRecord,
} from '@/src/services/updateStore';

/**
 * 应用内更新（OTA）：设置页手动拉取 latest.json，可续传下载并展示进度。
 *
 * latest.json: { versionCode, versionName, content, minSupport, url, md5? }
 */

function normalizeMd5(value: string): string {
  return value.trim().toLowerCase();
}

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

export type LatestManifest = {
  versionCode: number;
  versionName: string;
  content?: string;
  minSupport?: number;
  url: string;
  md5?: string;
};

function getApkFileUri(versionCode: number): string {
  const base = FileSystem.cacheDirectory ?? Paths.cache.uri;
  return `${base}baby-world-update-${versionCode}.apk`;
}

function getCurrentVersionCode(): number {
  if (Platform.OS !== 'android') return 0;
  const native = Application.nativeBuildVersion;
  const n = native ? parseInt(native, 10) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function getUpdateCheckUrl(): string | null {
  type UpdateExtra = { updateCheckUrl?: string };
  const fromExtra =
    (Constants.expoConfig?.extra as UpdateExtra | undefined)?.updateCheckUrl ??
    (Constants.manifest as { extra?: UpdateExtra } | null)?.extra?.updateCheckUrl;
  const url = fromExtra ?? process.env.EXPO_PUBLIC_UPDATE_CHECK_URL;
  if (!url) return null;
  if (url.includes('download.example.com')) return null;
  return url;
}

async function fetchManifest(url: string): Promise<LatestManifest | null> {
  try {
    const bustUrl = appendQueryParam(url, 't', String(Date.now()));
    const res = await fetch(bustUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as LatestManifest;
    if (
      typeof json.versionCode !== 'number' ||
      typeof json.url !== 'string' ||
      typeof json.versionName !== 'string'
    ) {
      return null;
    }
    return json;
  } catch {
    return null;
  }
}

async function verifyApkMd5(manifest: LatestManifest, fileUri: string): Promise<void> {
  if (!manifest.md5) return;
  const file = new File(fileUri);
  const expected = normalizeMd5(manifest.md5);
  const actual = file.md5 ? normalizeMd5(file.md5) : null;
  if (!actual || actual !== expected) {
    throw new Error('apk md5 mismatch');
  }
}

async function installApkFile(fileUri: string): Promise<void> {
  const file = new File(fileUri);
  const contentUri = file.contentUri;
  if (!contentUri) throw new Error('contentUri unavailable');
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1,
    type: 'application/vnd.android.package-archive',
  });
}

let activeResumable: DownloadResumable | null = null;
let checking = false;
let progressSaveTimer: ReturnType<typeof setTimeout> | null = null;

function updateDownloadProgress(
  manifest: LatestManifest,
  fileUri: string,
  bytes: number,
  total: number
): void {
  const progress = total > 0 ? bytes / total : undefined;
  setUpdateUiSnapshot({
    phase: 'downloading',
    versionName: manifest.versionName,
    versionCode: manifest.versionCode,
    progress,
    progressBytes: bytes,
    progressTotal: total,
    message: formatDownloadProgress(bytes, total),
    downloadActive: true,
  });

  if (progressSaveTimer) return;
  progressSaveTimer = setTimeout(() => {
    progressSaveTimer = null;
    void savePendingUpdate({
      versionCode: manifest.versionCode,
      versionName: manifest.versionName,
      url: manifest.url,
      md5: manifest.md5,
      fileUri,
      status: 'downloading',
      resumeState: activeResumable?.savable() ?? null,
      progressBytes: bytes,
      progressTotal: total,
    });
  }, 400);
}

async function markDownloadReady(record: PendingUpdateRecord): Promise<void> {
  const ready: PendingUpdateRecord = { ...record, status: 'completed' };
  await savePendingUpdate(ready);
  setUpdateUiSnapshot({
    phase: 'ready',
    versionName: record.versionName,
    versionCode: record.versionCode,
    progress: 1,
    progressBytes: record.progressTotal > 0 ? record.progressTotal : record.progressBytes,
    progressTotal: record.progressTotal,
    message: '下载完成，可安装',
  });
}

async function markDownloadFailed(
  record: Partial<PendingUpdateRecord> & Pick<PendingUpdateRecord, 'versionCode' | 'versionName' | 'url' | 'fileUri'>,
  errorMessage: string
): Promise<void> {
  const failed: PendingUpdateRecord = {
    versionCode: record.versionCode,
    versionName: record.versionName,
    url: record.url,
    md5: record.md5,
    fileUri: record.fileUri,
    status: 'failed',
    resumeState: activeResumable?.savable() ?? record.resumeState ?? null,
    progressBytes: record.progressBytes ?? 0,
    progressTotal: record.progressTotal ?? 0,
    errorMessage,
  };
  await savePendingUpdate(failed);
  setUpdateUiSnapshot({
    phase: 'failed',
    versionName: failed.versionName,
    versionCode: failed.versionCode,
    message: errorMessage,
  });
}

export async function downloadManifestUpdate(manifest: LatestManifest): Promise<void> {
  if (Platform.OS !== 'android') return;

  const snap = getUpdateUiSnapshot();
  if (snap.phase === 'downloading') return;

  const fileUri = getApkFileUri(manifest.versionCode);
  const pending = await loadPendingUpdate();
  const resumeData =
    pending?.versionCode === manifest.versionCode
      ? pending.resumeState?.resumeData ?? undefined
      : undefined;

  const baseRecord: PendingUpdateRecord = {
    versionCode: manifest.versionCode,
    versionName: manifest.versionName,
    url: manifest.url,
    md5: manifest.md5,
    fileUri,
    status: 'downloading',
    resumeState: null,
    progressBytes: pending?.versionCode === manifest.versionCode ? pending.progressBytes : 0,
    progressTotal: pending?.versionCode === manifest.versionCode ? pending.progressTotal : 0,
  };
  await savePendingUpdate(baseRecord);
  updateDownloadProgress(
    manifest,
    fileUri,
    baseRecord.progressBytes,
    baseRecord.progressTotal
  );

  const resumable = FileSystem.createDownloadResumable(
    manifest.url,
    fileUri,
    { md5: false },
    (progress) => {
      updateDownloadProgress(
        manifest,
        fileUri,
        progress.totalBytesWritten,
        progress.totalBytesExpectedToWrite
      );
    },
    resumeData
  );

  activeResumable = resumable;

  try {
    const result = await resumable.downloadAsync();
    activeResumable = null;
    if (!result) {
      throw new Error('download cancelled');
    }

    await verifyApkMd5(manifest, fileUri);
    const snap = getUpdateUiSnapshot();
    await markDownloadReady({
      ...baseRecord,
      progressBytes: snap.progressBytes ?? baseRecord.progressBytes,
      progressTotal: snap.progressTotal ?? baseRecord.progressTotal,
    });
  } catch (e) {
    activeResumable = null;
    const message =
      e instanceof Error && e.message === 'apk md5 mismatch'
        ? '安装包校验失败，可能下载不完整或被缓存。'
        : '下载失败，请检查网络后重试。';
    await markDownloadFailed(baseRecord, message);
    throw e;
  }
}

/** 离开设置页时暂停，便于稍后续传 */
export async function pauseActiveDownloadForResume(): Promise<void> {
  if (!activeResumable) return;
  try {
    const pauseState = await activeResumable.pauseAsync();
    const pending = await loadPendingUpdate();
    if (pending) {
      await savePendingUpdate({
        ...pending,
        status: 'downloading',
        resumeState: pauseState,
      });
    }
    const snap = getUpdateUiSnapshot();
    if (snap.phase === 'downloading') {
      setUpdateUiSnapshot({
        ...snap,
        downloadActive: false,
        message: `${snap.message ?? ''} · 已暂停，可继续`.replace(/^ · /, ''),
      });
    }
  } catch {
    /* noop */
  } finally {
    activeResumable = null;
  }
}

export async function continueUpdateDownload(): Promise<void> {
  const pending = await loadPendingUpdate();
  if (!pending || pending.status !== 'downloading') return;
  if (getUpdateUiSnapshot().phase === 'downloading' && activeResumable) return;

  await downloadManifestUpdate({
    versionCode: pending.versionCode,
    versionName: pending.versionName,
    url: pending.url,
    md5: pending.md5,
  });
}

export async function resumePendingDownload(): Promise<boolean> {
  const pending = await loadPendingUpdate();
  if (!pending || pending.status !== 'downloading' || !pending.resumeState) {
    return false;
  }
  if (getUpdateUiSnapshot().phase === 'downloading') return true;

  await continueUpdateDownload();
  return true;
}

export async function installPendingUpdate(): Promise<void> {
  const pending = await loadPendingUpdate();
  if (!pending || pending.status !== 'completed') {
    Alert.alert('无法安装', '没有已下载完成的更新包。');
    return;
  }
  if (pending.versionCode <= getCurrentVersionCode()) {
    await clearPendingUpdate();
    setUpdateUiSnapshot({ phase: 'idle' });
    Alert.alert('无需安装', '该更新包已过期或版本不高于当前安装。');
    return;
  }
  try {
    await installApkFile(pending.fileUri);
  } catch (e) {
    Alert.alert('安装失败', '无法打开系统安装器，请稍后重试。');
    console.warn('[update] install failed', e);
  }
}

export async function syncPendingUpdateUi(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (getUpdateUiSnapshot().phase === 'downloading' || checking) return;

  const pending = await loadPendingUpdate();
  const current = getCurrentVersionCode();

  if (!pending || pending.versionCode <= current) {
    if (pending) await clearPendingUpdate();
    if (getUpdateUiSnapshot().phase !== 'idle') {
      setUpdateUiSnapshot({ phase: 'idle' });
    }
    return;
  }

  if (pending.status === 'completed') {
    setUpdateUiSnapshot({
      phase: 'ready',
      versionName: pending.versionName,
      versionCode: pending.versionCode,
      progress: 1,
      message: '下载完成，可安装',
    });
    return;
  }

  if (pending.status === 'failed') {
    setUpdateUiSnapshot({
      phase: 'failed',
      versionName: pending.versionName,
      versionCode: pending.versionCode,
      message: pending.errorMessage ?? '下载失败',
    });
    return;
  }

  if (pending.status === 'downloading') {
    setUpdateUiSnapshot({
      phase: 'downloading',
      versionName: pending.versionName,
      versionCode: pending.versionCode,
      progress:
        pending.progressTotal > 0
          ? pending.progressBytes / pending.progressTotal
          : undefined,
      progressBytes: pending.progressBytes,
      progressTotal: pending.progressTotal,
      downloadActive: false,
      message: pending.resumeState?.resumeData
        ? `${formatDownloadProgress(pending.progressBytes, pending.progressTotal)} · 已暂停，可继续`
        : `${formatDownloadProgress(pending.progressBytes, pending.progressTotal)} · 未完成，可继续`,
    });
  }
}

function showBusyAlert(title: string, message: string): void {
  Alert.alert(title, message);
}

function showUpdateDialog(manifest: LatestManifest, force: boolean): Promise<void> {
  const notes = (manifest.content ?? '').replace(/#/g, '\n').trim();
  const title = `发现新版本 ${manifest.versionName}`;
  const message = notes || '是否立即下载更新？';

  const handleDownload = (resolve: () => void) => () => {
    void downloadManifestUpdate(manifest)
      .catch((e) => {
        const text =
          e instanceof Error && e.message === 'apk md5 mismatch'
            ? '安装包校验失败，可能下载不完整或被缓存。'
            : '下载或安装出现问题，请稍后重试。';
        Alert.alert('更新失败', text);
      })
      .finally(resolve);
  };

  return new Promise<void>((resolve) => {
    if (force) {
      Alert.alert(
        title,
        `${message}\n\n（本次更新为强制更新，必须升级后才能继续使用）`,
        [{ text: '立即下载', onPress: handleDownload(resolve) }],
        { cancelable: false }
      );
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: '稍后', style: 'cancel', onPress: () => resolve() },
          { text: '立即下载', onPress: handleDownload(resolve) },
        ],
        { cancelable: true }
      );
    }
  });
}

export type UpdateCheckResult =
  | 'skipped'
  | 'busy'
  | 'error'
  | 'up_to_date'
  | 'update_shown'
  | 'downloading'
  | 'ready';

export async function checkForUpdate(options?: {
  manual?: boolean;
}): Promise<UpdateCheckResult> {
  const manual = options?.manual ?? false;

  if (Platform.OS !== 'android') {
    if (manual) Alert.alert('暂不支持', '当前平台暂不支持应用内更新。');
    return 'skipped';
  }

  const ui = getUpdateUiSnapshot();
  if (ui.phase === 'downloading') {
    if (manual) {
      showBusyAlert(
        '正在下载',
        ui.message ?? `新版本 ${ui.versionName ?? ''} 正在下载，请稍候。`
      );
    }
    return 'downloading';
  }

  if (ui.phase === 'ready') {
    if (manual) {
      Alert.alert(
        '更新已就绪',
        `新版本 ${ui.versionName} 已下载完成。`,
        [
          { text: '稍后', style: 'cancel' },
          { text: '立即安装', onPress: () => void installPendingUpdate() },
        ]
      );
    }
    return 'ready';
  }

  if (checking) {
    if (manual) showBusyAlert('请稍候', '正在检查更新…');
    return 'busy';
  }

  checking = true;
  setUpdateUiSnapshot({ ...ui, phase: 'checking' });
  try {
    const pending = await loadPendingUpdate();
    const current = getCurrentVersionCode();
    if (
      pending &&
      pending.versionCode > current &&
      pending.status === 'downloading' &&
      pending.resumeState?.resumeData
    ) {
      if (manual) {
        Alert.alert(
          '继续下载',
          `检测到未完成的新版本 ${pending.versionName} 下载，是否继续？`,
          [
            { text: '取消', style: 'cancel' },
            {
              text: '继续下载',
              onPress: () => {
                void downloadManifestUpdate({
                  versionCode: pending.versionCode,
                  versionName: pending.versionName,
                  url: pending.url,
                  md5: pending.md5,
                });
              },
            },
          ]
        );
        return 'downloading';
      }
    }

    const url = getUpdateCheckUrl();
    if (!url) {
      if (manual) Alert.alert('无法检查', '更新服务未配置。');
      await syncPendingUpdateUi();
      return 'skipped';
    }

    const manifest = await fetchManifest(url);
    if (!manifest) {
      if (manual) Alert.alert('检查失败', '无法连接更新服务器，请稍后重试。');
      await syncPendingUpdateUi();
      return 'error';
    }

    if (manifest.versionCode <= current) {
      if (manual) {
        const versionName = Application.nativeApplicationVersion ?? '未知';
        Alert.alert('已是最新版本', `当前版本 ${versionName} 已是最新。`);
      }
      await syncPendingUpdateUi();
      return 'up_to_date';
    }

    if (
      pending &&
      pending.versionCode === manifest.versionCode &&
      pending.status === 'completed'
    ) {
      await syncPendingUpdateUi();
      if (manual) {
        Alert.alert(
          '更新已就绪',
          `新版本 ${manifest.versionName} 已下载完成。`,
          [
            { text: '稍后', style: 'cancel' },
            { text: '立即安装', onPress: () => void installPendingUpdate() },
          ]
        );
      }
      return 'ready';
    }

    const force = (manifest.minSupport ?? 0) > current;
    await syncPendingUpdateUi();
    await showUpdateDialog(manifest, force);
    await syncPendingUpdateUi();
    return 'update_shown';
  } finally {
    checking = false;
    if (getUpdateUiSnapshot().phase === 'checking') {
      await syncPendingUpdateUi();
    }
  }
}

export async function retryFailedDownload(): Promise<void> {
  const pending = await loadPendingUpdate();
  if (!pending || pending.status !== 'failed') return;
  await savePendingUpdate({ ...pending, status: 'downloading', errorMessage: undefined });
  await downloadManifestUpdate({
    versionCode: pending.versionCode,
    versionName: pending.versionName,
    url: pending.url,
    md5: pending.md5,
  });
}

export {
  formatDownloadProgress,
  getUpdateUiSnapshot,
  subscribeUpdateUi,
} from '@/src/services/updateStore';
