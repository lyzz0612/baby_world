import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Alert, Platform } from 'react-native';

/**
 * 应用内更新（OTA）：设置页手动拉取远端 latest.json，比 versionCode；
 * 远端更高时弹原生 Alert 让用户选择「立即更新 / 稍后」；
 * 远端 minSupport > 本机 versionCode 时只给「立即更新」（best-effort 强制更新）。
 *
 * latest.json 结构与旧 Capacitor / fccaikai 客户端完全一致：
 *   { versionCode, versionName, content, minSupport, url }
 *   - content：用 `#` 分隔的多行更新说明
 *   - url：APK 下载地址（HTTPS）
 */

type LatestManifest = {
  versionCode: number;
  versionName: string;
  content?: string;
  minSupport?: number;
  url: string;
};

function getCurrentVersionCode(): number {
  if (Platform.OS !== 'android') return 0;
  const native = Application.nativeBuildVersion;
  const n = native ? parseInt(native, 10) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function getUpdateCheckUrl(): string | null {
  const extra = Constants.expoConfig?.extra as
    | { updateCheckUrl?: string }
    | undefined;
  const url = extra?.updateCheckUrl;
  if (!url) return null;
  // 占位域名直接跳过，避免开发环境无意义的网络请求
  if (url.includes('download.example.com')) return null;
  return url;
}

async function fetchManifest(url: string): Promise<LatestManifest | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
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

async function downloadAndInstall(manifest: LatestManifest): Promise<void> {
  const file = await File.downloadFileAsync(manifest.url, Paths.cache, {
    idempotent: true,
  });
  const contentUri = file.contentUri;
  if (!contentUri) throw new Error('contentUri unavailable');
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}

function showUpdateDialog(manifest: LatestManifest, force: boolean): Promise<void> {
  const notes = (manifest.content ?? '').replace(/#/g, '\n').trim();
  const title = `发现新版本 ${manifest.versionName}`;
  const message = notes || '是否立即下载更新？';

  const handleInstall = (resolve: () => void) => async () => {
    try {
      await downloadAndInstall(manifest);
    } catch (e) {
      Alert.alert('更新失败', '下载或安装出现问题，请稍后重试。');
      console.warn('[update] install failed', e);
    } finally {
      resolve();
    }
  };

  return new Promise<void>((resolve) => {
    if (force) {
      Alert.alert(
        title,
        `${message}\n\n（本次更新为强制更新，必须升级后才能继续使用）`,
        [{ text: '立即更新', onPress: handleInstall(resolve) }],
        { cancelable: false }
      );
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: '稍后', style: 'cancel', onPress: () => resolve() },
          { text: '立即更新', onPress: handleInstall(resolve) },
        ],
        { cancelable: true }
      );
    }
  });
}

export type UpdateCheckResult =
  | 'skipped'
  | 'error'
  | 'up_to_date'
  | 'update_shown';

let checking = false;

/**
 * 检查应用更新。仅应在设置页手动触发；`manual: true` 时会向用户展示检查结果。
 */
export async function checkForUpdate(options?: {
  manual?: boolean;
}): Promise<UpdateCheckResult> {
  const manual = options?.manual ?? false;

  if (Platform.OS !== 'android') {
    if (manual) {
      Alert.alert('暂不支持', '当前平台暂不支持应用内更新。');
    }
    return 'skipped';
  }
  if (checking) return 'skipped';
  checking = true;
  try {
    const url = getUpdateCheckUrl();
    if (!url) {
      if (manual) {
        Alert.alert('无法检查', '更新服务未配置。');
      }
      return 'skipped';
    }

    const manifest = await fetchManifest(url);
    if (!manifest) {
      if (manual) {
        Alert.alert('检查失败', '无法连接更新服务器，请稍后重试。');
      }
      return 'error';
    }

    const current = getCurrentVersionCode();
    if (manifest.versionCode <= current) {
      if (manual) {
        const versionName = Application.nativeApplicationVersion ?? '未知';
        Alert.alert('已是最新版本', `当前版本 ${versionName} 已是最新。`);
      }
      return 'up_to_date';
    }

    const force = (manifest.minSupport ?? 0) > current;
    await showUpdateDialog(manifest, force);
    return 'update_shown';
  } finally {
    checking = false;
  }
}
