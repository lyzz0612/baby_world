import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DownloadPauseState } from 'expo-file-system/legacy';

const STORAGE_KEY = 'baby-world-ota-pending';

export type PendingUpdateRecord = {
  versionCode: number;
  versionName: string;
  url: string;
  md5?: string;
  fileUri: string;
  status: 'downloading' | 'completed' | 'failed';
  resumeState?: DownloadPauseState | null;
  progressBytes: number;
  progressTotal: number;
  errorMessage?: string;
};

export type UpdateUiPhase =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'failed';

export type UpdateUiSnapshot = {
  phase: UpdateUiPhase;
  versionName?: string;
  versionCode?: number;
  progress?: number;
  progressBytes?: number;
  progressTotal?: number;
  message?: string;
  /** 当前是否有活跃下载任务（非暂停） */
  downloadActive?: boolean;
};

let snapshot: UpdateUiSnapshot = { phase: 'idle' };
const listeners = new Set<(s: UpdateUiSnapshot) => void>();

export function getUpdateUiSnapshot(): UpdateUiSnapshot {
  return snapshot;
}

export function setUpdateUiSnapshot(next: UpdateUiSnapshot): void {
  snapshot = next;
  listeners.forEach((fn) => fn(snapshot));
}

export function subscribeUpdateUi(listener: (s: UpdateUiSnapshot) => void): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

export async function loadPendingUpdate(): Promise<PendingUpdateRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingUpdateRecord;
  } catch {
    return null;
  }
}

export async function savePendingUpdate(record: PendingUpdateRecord): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export async function clearPendingUpdate(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function formatDownloadProgress(bytes: number, total: number): string {
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (total > 0) {
    const pct = Math.min(100, Math.round((bytes / total) * 100));
    return `${pct}% · ${mb(bytes)} / ${mb(total)}`;
  }
  return `已下载 ${mb(bytes)}`;
}
