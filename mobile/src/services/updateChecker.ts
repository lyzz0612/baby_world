import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import type { DownloadResumable } from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';
import {
  clearPendingUpdate,
  formatDownloadProgress,
  getUpdateUiSnapshot,
  isDownloadProgressComplete,
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

function getLocalApkSize(fileUri: string): number {
  try {
    const file = new File(fileUri);
    return file.exists ? file.size : 0;
  } catch {
    return 0;
  }
}

async function computeFileMd5(fileUri: string): Promise<string | null> {
  try {
    const file = new File(fileUri);
    if (file.md5) return normalizeMd5(file.md5);
  } catch {
    /* noop */
  }
  try {
    const info = await FileSystem.getInfoAsync(fileUri, { md5: true });
    if (info.exists && 'md5' in info && info.md5) {
      return normalizeMd5(String(info.md5));
    }
  } catch {
    /* noop */
  }
  return null;
}

function isApkFileComplete(pending: PendingUpdateRecord): boolean {
  const size = getLocalApkSize(pending.fileUri);
  if (size <= 0) return false;
  if (pending.progressTotal > 0) {
    return size >= pending.progressTotal * 0.995;
  }
  return isDownloadProgressComplete(pending.progressBytes, pending.progressTotal) && size > 1024 * 1024;
}

async function verifyApkMd5(manifest: Pick<LatestManifest, 'md5'>, fileUri: string): Promise<void> {
  if (!manifest.md5) return;
  const expected = normalizeMd5(manifest.md5);
  const actual = await computeFileMd5(fileUri);
  if (!actual || actual !== expected) {
    throw new Error('apk md5 mismatch');
  }
}

async function installApkFile(fileUri: string): Promise<void> {
  const file = new File(fileUri);
  if (!file.exists) throw new Error('apk file missing');
  const contentUri = file.contentUri;
  if (!contentUri) throw new Error('contentUri unavailable');
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1,
    type: 'application/vnd.android.package-archive',
  });
}

async function deleteLocalApk(fileUri: string): Promise<void> {
  try {
    const file = new File(fileUri);
    if (file.exists) file.delete();
  } catch {
    /* noop */
  }
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch {
    /* noop */
  }
}

function showFallbackAlert(title: string, message: string, downloadUrl?: string): void {
  Alert.alert(title, message, [
    { text: '取消', style: 'cancel' },
    {
      text: '重新下载',
      onPress: () => {
        void forceRedownloadUpdate();
      },
    },
    {
      text: '浏览器下载',
      onPress: () => {
        void openUpdateDownloadInBrowser(downloadUrl);
      },
    },
  ]);
}

let activeResumable: DownloadResumable | null = null;
let checking = false;
let progressSaveTimer: ReturnType<typeof setTimeout> | null = null;

function manifestFromPending(pending: PendingUpdateRecord): LatestManifest {
  return {
    versionCode: pending.versionCode,
    versionName: pending.versionName,
    url: pending.url,
    md5: pending.md5,
  };
}

function updateDownloadProgress(
  manifest: LatestManifest,
  fileUri: string,
  bytes: number,
  total: number,
  message?: string
): void {
  const progress = total > 0 ? bytes / total : undefined;
  setUpdateUiSnapshot({
    phase: 'downloading',
    versionName: manifest.versionName,
    versionCode: manifest.versionCode,
    progress,
    progressBytes: bytes,
    progressTotal: total,
    message: message ?? formatDownloadProgress(bytes, total),
    downloadActive: true,
    downloadUrl: manifest.url,
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
  const size = getLocalApkSize(record.fileUri);
  const ready: PendingUpdateRecord = {
    ...record,
    status: 'completed',
    progressBytes: size > 0 ? size : record.progressBytes,
    progressTotal: record.progressTotal > 0 ? record.progressTotal : size,
    resumeState: null,
    errorMessage: undefined,
  };
  await savePendingUpdate(ready);
  setUpdateUiSnapshot({
    phase: 'ready',
    versionName: record.versionName,
    versionCode: record.versionCode,
    progress: 1,
    progressBytes: ready.progressBytes,
    progressTotal: ready.progressTotal,
    message: '下载完成，可安装',
    downloadUrl: record.url,
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
    downloadUrl: failed.url,
  });
}

/** 下载已到齐但未标记完成时，尝试校验并转为可安装 */
export async function tryFinalizePendingDownload(
  pending?: PendingUpdateRecord | null
): Promise<boolean> {
  const record = pending ?? (await loadPendingUpdate());
  if (!record || record.status === 'completed') {
    return record?.status === 'completed';
  }
  if (!isApkFileComplete(record)) return false;

  setUpdateUiSnapshot({
    phase: 'downloading',
    versionName: record.versionName,
    versionCode: record.versionCode,
    progress: 1,
    progressBytes: record.progressBytes,
    progressTotal: record.progressTotal,
    message: '下载完成，正在校验安装包…',
    downloadActive: false,
    downloadUrl: record.url,
  });

  try {
    await verifyApkMd5(manifestFromPending(record), record.fileUri);
    await markDownloadReady(record);
    return true;
  } catch {
    await markDownloadFailed(record, '安装包校验失败，请重新下载或使用浏览器下载。');
    return false;
  }
}

export async function openUpdateDownloadInBrowser(url?: string): Promise<void> {
  let target = url;
  if (!target) {
    const pending = await loadPendingUpdate();
    target = pending?.url;
  }
  if (!target) {
    const checkUrl = getUpdateCheckUrl();
    if (checkUrl) {
      const manifest = await fetchManifest(checkUrl);
      target = manifest?.url;
    }
  }
  if (!target) {
    Alert.alert('无法打开', '没有可用的下载链接，请稍后重试。');
    return;
  }
  try {
    await Linking.openURL(appendQueryParam(target, 't', String(Date.now())));
  } catch {
    Alert.alert('无法打开浏览器', '请复制链接到浏览器手动下载。');
  }
}

export async function forceRedownloadUpdate(manifest?: LatestManifest): Promise<void> {
  if (activeResumable) {
    activeResumable = null;
  }

  const pending = await loadPendingUpdate();
  const target =
    manifest ??
    (pending
      ? manifestFromPending(pending)
      : null);

  if (pending?.fileUri) {
    await deleteLocalApk(pending.fileUri);
  }
  await clearPendingUpdate();
  setUpdateUiSnapshot({ phase: 'idle' });

  if (!target) {
    await checkForUpdate({ manual: true });
    return;
  }

  await downloadManifestUpdate(target, { force: true });
}

export async function downloadManifestUpdate(
  manifest: LatestManifest,
  options?: { force?: boolean }
): Promise<void> {
  if (Platform.OS !== 'android') return;

  if (activeResumable) return;

  if (!options?.force) {
    const snap = getUpdateUiSnapshot();
    if (snap.phase === 'downloading' && snap.downloadActive) return;

    const pending = await loadPendingUpdate();
    if (pending?.versionCode === manifest.versionCode && pending.status !== 'failed') {
      if (await tryFinalizePendingDownload(pending)) return;
    }
  }

  const fileUri = getApkFileUri(manifest.versionCode);
  const pending = await loadPendingUpdate();
  const resumeData =
    !options?.force &&
    pending?.versionCode === manifest.versionCode &&
    pending.status === 'downloading'
      ? pending.resumeState?.resumeData ?? undefined
      : undefined;

  if (options?.force) {
    await deleteLocalApk(fileUri);
  }

  const baseRecord: PendingUpdateRecord = {
    versionCode: manifest.versionCode,
    versionName: manifest.versionName,
    url: manifest.url,
    md5: manifest.md5,
    fileUri,
    status: 'downloading',
    resumeState: null,
    progressBytes:
      !options?.force && pending?.versionCode === manifest.versionCode
        ? pending.progressBytes
        : 0,
    progressTotal:
      !options?.force && pending?.versionCode === manifest.versionCode
        ? pending.progressTotal
        : 0,
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
    { md5: true },
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

    if (progressSaveTimer) {
      clearTimeout(progressSaveTimer);
      progressSaveTimer = null;
    }

    const finalBytes = getLocalApkSize(fileUri) || (getUpdateUiSnapshot().progressBytes ?? 0);
    const snapTotal = getUpdateUiSnapshot().progressTotal ?? 0;
    const finalTotal = snapTotal > 0 ? snapTotal : finalBytes;

    updateDownloadProgress(manifest, fileUri, finalBytes, finalTotal, '下载完成，正在校验安装包…');
    setUpdateUiSnapshot({
      ...getUpdateUiSnapshot(),
      downloadActive: false,
    });

    if (manifest.md5 && result.md5) {
      const expected = normalizeMd5(manifest.md5);
      const actual = normalizeMd5(result.md5);
      if (actual !== expected) {
        throw new Error('apk md5 mismatch');
      }
    } else {
      await verifyApkMd5(manifest, fileUri);
    }

    await markDownloadReady({
      ...baseRecord,
      progressBytes: finalBytes,
      progressTotal: finalTotal,
    });
  } catch (e) {
    activeResumable = null;
    const snap = getUpdateUiSnapshot();
    const message =
      e instanceof Error && e.message === 'apk md5 mismatch'
        ? '安装包校验失败，可能下载不完整或被 CDN 缓存。请重新下载或使用浏览器下载。'
        : '下载失败，请检查网络后重试。';
    await markDownloadFailed(
      {
        ...baseRecord,
        progressBytes: snap.progressBytes ?? baseRecord.progressBytes,
        progressTotal: snap.progressTotal ?? baseRecord.progressTotal,
      },
      message
    );
    throw e;
  }
}

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
  if (!pending) return;

  if (pending.status === 'completed') {
    await syncPendingUpdateUi();
    return;
  }

  if (await tryFinalizePendingDownload(pending)) return;
  if (activeResumable) return;

  await downloadManifestUpdate(manifestFromPending(pending), {
    force: !pending.resumeState?.resumeData,
  });
}

export async function resumePendingDownload(): Promise<boolean> {
  const pending = await loadPendingUpdate();
  if (!pending || pending.status !== 'downloading') {
    return false;
  }
  if (getUpdateUiSnapshot().phase === 'downloading' && activeResumable) return true;

  await continueUpdateDownload();
  return true;
}

export async function installPendingUpdate(): Promise<void> {
  let pending = await loadPendingUpdate();

  if (pending && pending.status !== 'completed') {
    await tryFinalizePendingDownload(pending);
    pending = await loadPendingUpdate();
  }

  if (!pending || pending.status !== 'completed') {
    showFallbackAlert(
      '无法安装',
      pending?.errorMessage ?? '没有已下载完成的更新包。可重新下载或使用浏览器下载。',
      pending?.url
    );
    return;
  }

  if (pending.versionCode <= getCurrentVersionCode()) {
    await clearPendingUpdate();
    setUpdateUiSnapshot({ phase: 'idle' });
    Alert.alert('无需安装', '该更新包已过期或版本不高于当前安装。');
    return;
  }

  if (!getLocalApkSize(pending.fileUri)) {
    await markDownloadFailed(pending, '本地安装包已丢失，请重新下载。');
    showFallbackAlert('安装包丢失', '本地文件不存在，请重新下载。', pending.url);
    return;
  }

  try {
    await installApkFile(pending.fileUri);
  } catch (e) {
    showFallbackAlert(
      '安装失败',
      '无法打开系统安装器。可重新下载或使用浏览器下载后手动安装。',
      pending.url
    );
    console.warn('[update] install failed', e);
  }
}

export async function syncPendingUpdateUi(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (getUpdateUiSnapshot().phase === 'downloading' && activeResumable) return;
  if (checking) return;

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
      downloadUrl: pending.url,
    });
    return;
  }

  if (pending.status === 'failed') {
    setUpdateUiSnapshot({
      phase: 'failed',
      versionName: pending.versionName,
      versionCode: pending.versionCode,
      message: pending.errorMessage ?? '下载失败',
      downloadUrl: pending.url,
    });
    return;
  }

  if (pending.status === 'downloading') {
    if (await tryFinalizePendingDownload(pending)) return;

    const stuck = isApkFileComplete(pending);
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
      downloadUrl: pending.url,
      message: stuck
        ? `${formatDownloadProgress(pending.progressBytes, pending.progressTotal)} · 校验未完成，请点继续或重新下载`
        : pending.resumeState?.resumeData
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
      .catch(() => {
        showFallbackAlert(
          '更新失败',
          '应用内下载或校验失败，可重新下载或使用浏览器下载。',
          manifest.url
        );
      })
      .finally(resolve);
  };

  return new Promise<void>((resolve) => {
    if (force) {
      Alert.alert(
        title,
        `${message}\n\n（本次更新为强制更新，必须升级后才能继续使用）`,
        [
          { text: '浏览器下载', onPress: () => void openUpdateDownloadInBrowser(manifest.url) },
          { text: '立即下载', onPress: handleDownload(resolve) },
        ],
        { cancelable: false }
      );
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: '稍后', style: 'cancel', onPress: () => resolve() },
          { text: '浏览器下载', onPress: () => void openUpdateDownloadInBrowser(manifest.url) },
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
  if (ui.phase === 'downloading' && ui.downloadActive) {
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
    await syncPendingUpdateUi();

    const pending = await loadPendingUpdate();
    const current = getCurrentVersionCode();

    if (
      pending &&
      pending.versionCode > current &&
      pending.status === 'downloading' &&
      !activeResumable
    ) {
      if (manual) {
        Alert.alert(
          '继续更新',
          `检测到未完成的新版本 ${pending.versionName} 下载。`,
          [
            { text: '取消', style: 'cancel' },
            { text: '浏览器下载', onPress: () => void openUpdateDownloadInBrowser(pending.url) },
            { text: '继续下载', onPress: () => void continueUpdateDownload() },
            { text: '重新下载', onPress: () => void forceRedownloadUpdate(manifestFromPending(pending)) },
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
  if (!pending) return;
  await forceRedownloadUpdate(manifestFromPending(pending));
}

export {
  formatDownloadProgress,
  getUpdateUiSnapshot,
  subscribeUpdateUi,
} from '@/src/services/updateStore';
