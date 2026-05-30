import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app-settings';

/** 关系图详情弹窗：打开后需等待该秒数才允许点空白关闭（防连点误关） */
export const FAMILY_MODAL_CLOSE_DELAY_MIN_SEC = 0;
export const FAMILY_MODAL_CLOSE_DELAY_MAX_SEC = 2;
export const FAMILY_MODAL_CLOSE_DELAY_DEFAULT_SEC = 0.5;
export const FAMILY_MODAL_CLOSE_DELAY_STEP_SEC = 0.1;

type AppSettings = {
  familyModalCloseDelaySec: number;
};

const DEFAULTS: AppSettings = {
  familyModalCloseDelaySec: FAMILY_MODAL_CLOSE_DELAY_DEFAULT_SEC,
};

let cache: AppSettings | null = null;
let loadPromise: Promise<AppSettings> | null = null;
let saveQueue: Promise<void> = Promise.resolve();

function clampFamilyModalCloseDelaySec(value: number): number {
  const stepped = Math.round(value / FAMILY_MODAL_CLOSE_DELAY_STEP_SEC) * FAMILY_MODAL_CLOSE_DELAY_STEP_SEC;
  return Math.min(
    FAMILY_MODAL_CLOSE_DELAY_MAX_SEC,
    Math.max(FAMILY_MODAL_CLOSE_DELAY_MIN_SEC, stepped)
  );
}

function normalizeSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  const record = raw as Record<string, unknown>;
  const delay =
    typeof record.familyModalCloseDelaySec === 'number'
      ? record.familyModalCloseDelaySec
      : DEFAULTS.familyModalCloseDelaySec;
  return {
    familyModalCloseDelaySec: clampFamilyModalCloseDelaySec(delay),
  };
}

async function loadOnce(): Promise<AppSettings> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        cache = raw ? normalizeSettings(JSON.parse(raw)) : { ...DEFAULTS };
      } catch {
        cache = { ...DEFAULTS };
      }
      return cache!;
    })();
  }
  return loadPromise;
}

export async function getAppSettings(): Promise<AppSettings> {
  const settings = await loadOnce();
  return { ...settings };
}

export async function getFamilyModalCloseDelaySec(): Promise<number> {
  const settings = await loadOnce();
  return settings.familyModalCloseDelaySec;
}

export function setFamilyModalCloseDelaySec(value: number): void {
  const next = clampFamilyModalCloseDelaySec(value);
  void loadOnce().then((settings) => {
    settings.familyModalCloseDelaySec = next;
    saveQueue = saveQueue.then(() =>
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {
        /* 内存 cache 仍是最新 */
      })
    );
  });
}

export function familyModalCloseDelayMs(sec: number): number {
  return Math.round(clampFamilyModalCloseDelaySec(sec) * 1000);
}
