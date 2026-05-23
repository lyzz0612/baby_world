export type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function findDropIndex(
  x: number,
  y: number,
  orderedIds: string[],
  layouts: Map<string, LayoutRect>,
  draggingId: string
): number | null {
  let hitIndex: number | null = null;
  orderedIds.forEach((id, index) => {
    if (id === draggingId) return;
    const rect = layouts.get(id);
    if (!rect) return;
    if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
      hitIndex = index;
    }
  });
  if (hitIndex != null) return hitIndex;

  let bestIndex = -1;
  let bestDistance = Infinity;
  orderedIds.forEach((id, index) => {
    if (id === draggingId) return;
    const rect = layouts.get(id);
    if (!rect) return;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const distance = (cx - x) ** 2 + (cy - y) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex >= 0 ? bestIndex : null;
}
