import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "qt_dispatch_today_v1";
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (shorter than jobs — dispatch is time-sensitive)

export type DispatchEntry = {
  id: string;
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  clientName: string | null;
  siteAddress: string | null;
  sitePostcode: string | null;
  startAtISO: string;
  endAtISO: string;
  status: string; // scheduled | en_route | on_site | in_progress | completed
  notes: string | null;
};

type CacheEntry = {
  at: number;
  entries: DispatchEntry[];
};

export async function getCachedDispatch(): Promise<DispatchEntry[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.at > CACHE_TTL_MS) return null;
    return entry.entries;
  } catch {
    return null;
  }
}

export async function setCachedDispatch(entries: DispatchEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ at: Date.now(), entries } satisfies CacheEntry),
    );
  } catch {
    // best-effort
  }
}
