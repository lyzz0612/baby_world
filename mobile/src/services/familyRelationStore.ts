import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createEmptyRelation,
  normalizeRelation,
  type FamilyRelation,
} from '@/src/data/familyRelations';
import { deleteFamilyImagesForId } from '@/src/services/familyImageStore';
import { deleteFamilyRecording } from '@/src/services/familyRecordingStore';

const STORAGE_KEY = 'family-relations-v2';

let cache: FamilyRelation[] | null = null;
let loadPromise: Promise<FamilyRelation[]> | null = null;

async function loadRelations(): Promise<FamilyRelation[]> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as FamilyRelation[]) : [];
        cache = Array.isArray(parsed) ? parsed.map(normalizeRelation) : [];
      } catch {
        cache = [];
      }
      return cache!;
    })();
  }
  return loadPromise;
}

async function persistRelations(relations: FamilyRelation[]): Promise<void> {
  cache = relations;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(relations));
}

export function createRelationId(): string {
  return `relation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getFamilyRelations(): Promise<FamilyRelation[]> {
  const relations = await loadRelations();
  return [...relations].sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveFamilyRelation(relation: FamilyRelation): Promise<FamilyRelation> {
  const normalized = normalizeRelation(relation);
  const relations = await loadRelations();
  const index = relations.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    relations[index] = normalized;
  } else {
    relations.push(normalized);
  }
  await persistRelations(relations);
  return normalized;
}

export async function deleteFamilyRelations(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const relations = await loadRelations();
  await persistRelations(relations.filter((item) => !idSet.has(item.id)));
  await Promise.all(
    ids.map(async (id) => {
      await deleteFamilyImagesForId(id);
      await deleteFamilyRecording(id);
    })
  );
}

export async function createNewRelationDraft(): Promise<FamilyRelation> {
  return createEmptyRelation(createRelationId());
}

export function invalidateFamilyRelationCache(): void {
  cache = null;
  loadPromise = null;
}
