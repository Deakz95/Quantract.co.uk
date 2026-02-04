import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "qt_job_detail_v1_";
const INDEX_KEY = "qt_job_detail_index_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES = 50;

type CachedDetail = {
  at: number;
  data: any; // full API response: { job, stages, variations, certs }
};

export async function getCachedJobDetail(jobId: string): Promise<{ data: any; cachedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + jobId);
    if (!raw) return null;
    const entry: CachedDetail = JSON.parse(raw);
    if (Date.now() - entry.at > CACHE_TTL_MS) return null;
    return { data: entry.data, cachedAt: entry.at };
  } catch {
    return null;
  }
}

export async function setCachedJobDetail(jobId: string, data: any): Promise<void> {
  try {
    const entry: CachedDetail = { at: Date.now(), data };
    await AsyncStorage.setItem(KEY_PREFIX + jobId, JSON.stringify(entry));
    await updateIndex(jobId);
  } catch {
    // best-effort
  }
}

async function updateIndex(jobId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(INDEX_KEY);
    let ids: string[] = raw ? JSON.parse(raw) : [];
    ids = ids.filter((id) => id !== jobId);
    ids.unshift(jobId); // most recent first
    // Evict oldest entries beyond MAX_ENTRIES
    if (ids.length > MAX_ENTRIES) {
      const evicted = ids.splice(MAX_ENTRIES);
      await Promise.all(evicted.map((id) => AsyncStorage.removeItem(KEY_PREFIX + id)));
    }
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  } catch {
    // best-effort
  }
}
