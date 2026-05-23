import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

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

export async function getFamilyImageMap(): Promise<ImageMap> {
  return { ...(await loadMap()) };
}

export async function getFamilyImageUri(id: string): Promise<string | null> {
  const map = await loadMap();
  const uri = map[id];
  if (!uri) return null;
  try {
    const file = new File(uri);
    return file.exists ? uri : null;
  } catch {
    return null;
  }
}

/** 从本地相册 URI 复制到应用目录并记录映射 */
export async function saveFamilyImage(id: string, pickedUri: string): Promise<string> {
  const dir = familyImagesDir();
  const dest = new File(dir, `${id}.jpg`);
  if (dest.exists) {
    dest.delete();
  }
  const src = new File(pickedUri);
  src.copy(dest);
  const map = await loadMap();
  map[id] = dest.uri;
  await persistMap(map);
  return dest.uri;
}
