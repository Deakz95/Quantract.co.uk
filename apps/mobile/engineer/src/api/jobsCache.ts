import AsyncStorage from "@react-native-async-storage/async-storage";
import type { JobListItem } from "../types/job";

const CACHE_KEY = "qt_engineer_jobs_v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type CacheEntry = {
  at: number;
  jobs: JobListItem[];
};

export async function getCachedJobs(): Promise<JobListItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.at > CACHE_TTL_MS) return null;
    return entry.jobs;
  } catch {
    return null;
  }
}

export async function setCachedJobs(jobs: JobListItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ at: Date.now(), jobs } satisfies CacheEntry),
    );
  } catch {
    // best-effort
  }
}
