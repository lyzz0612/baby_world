const STORAGE_KEY = 'animal-click-stats';

export function getClickCounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordAnimalClick(animalId) {
  const counts = getClickCounts();
  counts[animalId] = (counts[animalId] || 0) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
}

/** 点击多的排前面；次数相同则保持数据里的原始顺序 */
export function sortAnimalsByClicks(animals) {
  const counts = getClickCounts();
  const orderIndex = new Map(animals.map((a, i) => [a.id, i]));

  return [...animals].sort((a, b) => {
    const diff = (counts[b.id] || 0) - (counts[a.id] || 0);
    if (diff !== 0) return diff;
    return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
  });
}
