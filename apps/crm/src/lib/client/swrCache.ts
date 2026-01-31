/**
 * Stale-While-Revalidate cache using sessionStorage.
 * Shows cached data instantly, then revalidates in background.
 */

interface CacheEntry<T> {
  data: T;
  ts: number;
}

export function getCached<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`swr:${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    // Allow stale data up to 5 minutes (will be revalidated)
    if (Date.now() - entry.ts > 300_000) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`swr:${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Ignore quota errors
  }
}
