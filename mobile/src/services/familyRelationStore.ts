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

function compareRelations(a: FamilyRelation, b: FamilyRelation): number {
  const orderDiff = (a.sortOrder ?? a.createdAt) - (b.sortOrder ?? b.createdAt);
  return orderDiff !== 0 ? orderDiff : a.createdAt - b.createdAt;
}

async function loadRelations(): Promise<FamilyRelation[]> {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as FamilyRelation[]) : [];
        cache = Array.isArray(parsed) ? parsed.map(normalizeRelation).sort(compareRelations) : [];
      } catch {
        cache = [];
      }
      return cache!;
    })();
  }
  return loadPromise;
}

async function persistRelations(relations: FamilyRelation[]): Promise<void> {
  cache = [...relations].sort(compareRelations);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

export function createRelationId(): string {
  return `relation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getFamilyRelations(): Promise<FamilyRelation[]> {
  const relations = await loadRelations();
  return [...relations].sort(compareRelations);
}

export async function saveFamilyRelation(relation: FamilyRelation): Promise<FamilyRelation> {
  const relations = await loadRelations();
  const index = relations.findIndex((item) => item.id === relation.id);
  const maxOrder = relations.reduce((max, item) => Math.max(max, item.sortOrder ?? 0), -1);
  const normalized = normalizeRelation({
    ...relation,
    sortOrder: index >= 0 ? relations[index].sortOrder : maxOrder + 1,
  });

  if (index >= 0) {
    relations[index] = normalized;
  } else {
    relations.push(normalized);
  }
  await persistRelations(relations);
  return normalized;
}

export async function reorderFamilyRelations(orderedIds: string[]): Promise<FamilyRelation[]> {
  const relations = await loadRelations();
  const byId = new Map(relations.map((item) => [item.id, item]));
  const reordered: FamilyRelation[] = [];

  orderedIds.forEach((id, index) => {
    const item = byId.get(id);
    if (!item) return;
    reordered.push({ ...item, sortOrder: index });
    byId.delete(id);
  });

  byId.forEach((item) => {
    reordered.push({ ...item, sortOrder: reordered.length });
  });

  await persistRelations(reordered);
  return reordered;
}

export async function deleteFamilyRelations(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const relations = await loadRelations();
  const remaining = relations
    .filter((item) => !idSet.has(item.id))
    .map((item, index) => ({ ...item, sortOrder: index }));
  await persistRelations(remaining);
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
