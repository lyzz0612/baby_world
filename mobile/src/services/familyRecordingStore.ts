import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_KEY = 'family-custom-recordings';

type RecordingMap = Record<string, string>;

let cache: RecordingMap | null = null;
let loadPromise: Promise<RecordingMap> | null = null;

function recordingsDir(): Directory {
  const dir = new Directory(Paths.document, 'family-recordings');
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

async function loadMap(): Promise<RecordingMap> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        cache = raw ? (JSON.parse(raw) as RecordingMap) : {};
      } catch {
        cache = {};
      }
      return cache!;
    })();
  }
  return loadPromise;
}

async function persistMap(map: RecordingMap): Promise<void> {
  cache = map;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function deleteRecordingFile(uri?: string | null): void {
  if (!uri) return;
  try {
    const file = new File(stripQuery(uri));
    if (file.exists) file.delete();
  } catch {
    /* noop */
  }
}

function deleteRecordingsForId(id: string, keepUri?: string): void {
  const dir = recordingsDir();
  const keepPath = keepUri ? stripQuery(keepUri) : null;
  try {
    for (const entry of dir.list()) {
      if (!(entry instanceof File)) continue;
      if (!entry.name.startsWith(`${id}.`)) continue;
      if (keepPath && entry.uri === keepPath) continue;
      if (entry.exists) entry.delete();
    }
  } catch {
    /* noop */
  }
}

async function copyRecording(fromUri: string, toUri: string): Promise<void> {
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

export async function getFamilyRecordingMap(): Promise<RecordingMap> {
  const map = await loadMap();
  const result: RecordingMap = {};

  for (const [id, storedUri] of Object.entries(map)) {
    const fileUri = stripQuery(storedUri);
    const file = new File(fileUri);
    if (file.exists) {
      result[id] = withCacheBuster(fileUri);
    }
  }

  return result;
}

export async function getFamilyRecordingUri(id: string): Promise<string | null> {
  const map = await getFamilyRecordingMap();
  return map[id] ?? null;
}

export async function saveFamilyRecording(id: string, pickedUri: string): Promise<string> {
  const dir = recordingsDir();
  const map = await loadMap();
  const previousUri = map[id];
  const stamp = Date.now();
  const ext = stripQuery(pickedUri).split('.').pop() || 'm4a';
  const dest = new File(dir, `${id}.${stamp}.${ext}`);

  await copyRecording(pickedUri, dest.uri);

  if (!dest.exists || dest.size <= 0) {
    throw new Error('copy failed');
  }

  map[id] = dest.uri;
  await persistMap(map);

  deleteRecordingFile(previousUri);
  deleteRecordingsForId(id, dest.uri);

  return withCacheBuster(dest.uri);
}

export async function deleteFamilyRecording(id: string): Promise<void> {
  const map = await loadMap();
  const previousUri = map[id];
  delete map[id];
  await persistMap(map);
  deleteRecordingFile(previousUri);
  deleteRecordingsForId(id);
}

export function invalidateFamilyRecordingCache(): void {
  cache = null;
  loadPromise = null;
}
