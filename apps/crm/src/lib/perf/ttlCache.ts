/**
 * Lightweight in-memory TTL cache for per-request deduplication.
 * Each call site creates its own cache instance via createTtlCache().
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface TtlCache<T> {
  getOrSet(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
  delete(key: string): void;
  clear(): void;
}

export function createTtlCache<T>(): TtlCache<T> {
  const map = new Map<string, CacheEntry<T>>();

  return {
    async getOrSet(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
      const cached = map.get(key);
      if (cached && cached.expiresAt > Date.now()) return cached.value;
      const value = await fn();
      map.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    },
    delete(key: string) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}
