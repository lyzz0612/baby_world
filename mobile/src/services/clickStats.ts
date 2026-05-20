import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Animal } from '@/src/data/animals';

const STORAGE_KEY = 'animal-click-stats';

/**
 * 加载一次后维持在内存。
 * - 读：所有读都返回内存里的副本，避免快速点击时反复 await AsyncStorage
 * - 写：fire-and-forget，串行队列保证 read-modify-write 不互相覆盖
 */
let cache: Record<string, number> | null = null;
let loadPromise: Promise<Record<string, number>> | null = null;
let saveQueue: Promise<void> = Promise.resolve();

async function loadOnce(): Promise<Record<string, number>> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        cache = raw ? JSON.parse(raw) : {};
      } catch {
        cache = {};
      }
      return cache!;
    })();
  }
  return loadPromise;
}

export async function getClickCounts(): Promise<Record<string, number>> {
  return { ...(await loadOnce()) };
}

/** Fire-and-forget。caller 不需要 await，保证点击立即响应。 */
export function recordAnimalClick(animalId: string): void {
  void loadOnce().then((counts) => {
    counts[animalId] = (counts[animalId] || 0) + 1;
    // 串行写入，避免覆盖
    saveQueue = saveQueue.then(() =>
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(counts)).catch(() => {
        /* swallow write errors; 内存里的 cache 仍然是最新 */
      })
    );
  });
}

/** 仅在测试/调试时使用 */
export async function _flushPendingClicks(): Promise<void> {
  await saveQueue;
}

export async function sortAnimalsByClicks(animals: Animal[]): Promise<Animal[]> {
  const counts = await loadOnce();
  const orderIndex = new Map(animals.map((a, i) => [a.id, i]));

  return [...animals].sort((a, b) => {
    const diff = (counts[b.id] || 0) - (counts[a.id] || 0);
    if (diff !== 0) return diff;
    return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
  });
}
