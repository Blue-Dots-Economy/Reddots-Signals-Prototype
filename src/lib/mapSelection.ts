export interface MappablePoint {
  lat: number;
  lng: number;
}

export function selectDistributedTopN<T extends MappablePoint>(
  items: T[],
  limit: number,
  compare: (a: T, b: T) => number,
): T[] {
  if (items.length <= limit) return [...items].sort(compare);

  const sorted = [...items].sort(compare);
  const valid = sorted.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  if (valid.length <= limit) return valid;

  const minLat = Math.min(...valid.map((item) => item.lat));
  const maxLat = Math.max(...valid.map((item) => item.lat));
  const minLng = Math.min(...valid.map((item) => item.lng));
  const maxLng = Math.max(...valid.map((item) => item.lng));

  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;

  if (latSpan === 0 || lngSpan === 0) return sorted.slice(0, limit);

  const gridSize = Math.max(3, Math.ceil(Math.sqrt(limit)));
  const bucketMap = new Map<string, T[]>();

  for (const item of valid) {
    const row = Math.min(gridSize - 1, Math.floor(((item.lat - minLat) / latSpan) * gridSize));
    const col = Math.min(gridSize - 1, Math.floor(((item.lng - minLng) / lngSpan) * gridSize));
    const key = `${row}:${col}`;
    const bucket = bucketMap.get(key) ?? [];
    bucket.push(item);
    bucketMap.set(key, bucket);
  }

  const buckets = Array.from(bucketMap.values())
    .map((bucket) => bucket.sort(compare))
    .sort((a, b) => compare(a[0], b[0]));

  const selected: T[] = [];
  while (selected.length < limit) {
    let addedInRound = false;

    for (const bucket of buckets) {
      const next = bucket.shift();
      if (!next) continue;
      selected.push(next);
      addedInRound = true;
      if (selected.length >= limit) break;
    }

    if (!addedInRound) break;
  }

  return selected;
}