import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_KEY = 'family-custom-images-v2';
const LEGACY_STORAGE_KEY = 'family-custom-images';

export type FamilyImageVariant = 'list' | 'detail';

type ImageMap = Record<string, string>;

let cache: ImageMap | null = null;
let loadPromise: Promise<ImageMap> | null = null;

function familyImagesDir(): Directory {
  const dir = new Directory(Paths.document, 'family-images');
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

function storageKey(id: string, variant: FamilyImageVariant): string {
  return variant === 'list' ? id : `${id}__detail`;
}

function filePrefix(id: string, variant: FamilyImageVariant): string {
  return variant === 'list' ? `${id}.` : `${id}__detail.`;
}

function stripQuery(uri: string): string {
  return uri.split('?')[0];
}

function withCacheBuster(fileUri: string): string {
  try {
    const file = new File(fileUri);
    const stamp = file.modificationTime ?? Date.now();
    return `${fileUri}?v=${stamp}`;
  } catch {
    return `${fileUri}?v=${Date.now()}`;
  }
}

async function loadMap(): Promise<ImageMap> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          cache = JSON.parse(raw) as ImageMap;
        } else {
          const legacyRaw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
          cache = legacyRaw ? (JSON.parse(legacyRaw) as ImageMap) : {};
          if (legacyRaw && Object.keys(cache).length > 0) {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
          }
        }
      } catch {
        cache = {};
      }
      return cache!;
    })();
  }
  return loadPromise;
}

async function persistMap(map: ImageMap): Promise<void> {
  cache = map;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function deleteImageFile(uri?: string | null): void {
  if (!uri) return;
  try {
    const file = new File(stripQuery(uri));
    if (file.exists) file.delete();
  } catch {
    /* noop */
  }
}

function deleteImagesForKey(key: string, keepUri?: string): void {
  const dir = familyImagesDir();
  const keepPath = keepUri ? stripQuery(keepUri) : null;
  const prefix = key.includes('__detail') ? `${key.split('__detail')[0]}__detail.` : `${key}.`;
  try {
    for (const entry of dir.list()) {
      if (!(entry instanceof File)) continue;
      if (!entry.name.startsWith(prefix)) continue;
      if (keepPath && entry.uri === keepPath) continue;
      if (entry.exists) entry.delete();
    }
  } catch {
    /* noop */
  }
}

async function copyPickerImage(fromUri: string, toUri: string): Promise<void> {
  const dest = new File(toUri);
  if (dest.exists) {
    dest.delete();
  }

  try {
    const src = new File(fromUri);
    src.copy(dest);
    if (dest.exists && dest.size > 0) return;
  } catch {
    /* fallback below */
  }

  await FileSystem.copyAsync({ from: fromUri, to: toUri });
}

export async function getFamilyImageMap(): Promise<Record<string, string>> {
  const map = await loadMap();
  const result: Record<string, string> = {};

  for (const [key, storedUri] of Object.entries(map)) {
    const fileUri = stripQuery(storedUri);
    const file = new File(fileUri);
    if (file.exists) {
      result[key] = withCacheBuster(fileUri);
    }
  }

  return result;
}

export async function getFamilyListImageUri(id: string): Promise<string | null> {
  const map = await getFamilyImageMap();
  return map[storageKey(id, 'list')] ?? null;
}

export async function getFamilyDetailImageUri(id: string): Promise<string | null> {
  const map = await getFamilyImageMap();
  return map[storageKey(id, 'detail')] ?? map[storageKey(id, 'list')] ?? null;
}

/** 从本地相册 URI 复制到应用目录并记录映射 */
export async function saveFamilyImage(
  id: string,
  pickedUri: string,
  variant: FamilyImageVariant = 'list'
): Promise<string> {
  const dir = familyImagesDir();
  const map = await loadMap();
  const key = storageKey(id, variant);
  const previousUri = map[key];
  const stamp = Date.now();
  const dest = new File(dir, `${filePrefix(id, variant)}${stamp}.jpg`);

  await copyPickerImage(pickedUri, dest.uri);

  if (!dest.exists || dest.size <= 0) {
    throw new Error('copy failed');
  }

  map[key] = dest.uri;
  await persistMap(map);

  deleteImageFile(previousUri);
  deleteImagesForKey(key, dest.uri);

  return withCacheBuster(dest.uri);
}

export async function deleteFamilyListImage(id: string): Promise<void> {
  const key = storageKey(id, 'list');
  const map = await loadMap();
  deleteImageFile(map[key]);
  delete map[key];
  await persistMap(map);
  deleteImagesForKey(key);
}

export async function deleteFamilyDetailImage(id: string): Promise<void> {
  const key = storageKey(id, 'detail');
  const map = await loadMap();
  deleteImageFile(map[key]);
  delete map[key];
  await persistMap(map);
  deleteImagesForKey(key);
}

export async function deleteFamilyImagesForId(id: string): Promise<void> {
  const listKey = storageKey(id, 'list');
  const detailKey = storageKey(id, 'detail');
  const map = await loadMap();
  deleteImageFile(map[listKey]);
  deleteImageFile(map[detailKey]);
  delete map[listKey];
  delete map[detailKey];
  await persistMap(map);
  deleteImagesForKey(listKey);
  deleteImagesForKey(detailKey);
}

export function invalidateFamilyImageCache(): void {
  cache = null;
  loadPromise = null;
}
