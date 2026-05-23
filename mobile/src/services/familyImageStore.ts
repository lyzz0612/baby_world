import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_KEY = 'family-custom-images';

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
        cache = raw ? (JSON.parse(raw) as ImageMap) : {};
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

function deleteImagesForId(id: string, keepUri?: string): void {
  const dir = familyImagesDir();
  const keepPath = keepUri ? stripQuery(keepUri) : null;
  try {
    for (const entry of dir.list()) {
      if (!(entry instanceof File)) continue;
      if (!entry.name.startsWith(`${id}.`) && entry.name !== `${id}.jpg`) continue;
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

export async function getFamilyImageMap(): Promise<ImageMap> {
  const map = await loadMap();
  const result: ImageMap = {};

  for (const [id, storedUri] of Object.entries(map)) {
    const fileUri = stripQuery(storedUri);
    const file = new File(fileUri);
    if (file.exists) {
      result[id] = withCacheBuster(fileUri);
    }
  }

  return result;
}

export async function getFamilyImageUri(id: string): Promise<string | null> {
  const map = await getFamilyImageMap();
  return map[id] ?? null;
}

/** 从本地相册 URI 复制到应用目录并记录映射 */
export async function saveFamilyImage(id: string, pickedUri: string): Promise<string> {
  const dir = familyImagesDir();
  const map = await loadMap();
  const previousUri = map[id];

  const stamp = Date.now();
  const dest = new File(dir, `${id}.${stamp}.jpg`);

  await copyPickerImage(pickedUri, dest.uri);

  if (!dest.exists || dest.size <= 0) {
    throw new Error('copy failed');
  }

  map[id] = dest.uri;
  await persistMap(map);

  deleteImageFile(previousUri);
  deleteImagesForId(id, dest.uri);

  return withCacheBuster(dest.uri);
}

export function invalidateFamilyImageCache(): void {
  cache = null;
  loadPromise = null;
}
