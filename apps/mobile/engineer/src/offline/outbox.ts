import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { apiFetch } from "../api/client";

const OUTBOX_KEY = "qt_outbox_v1";
const MAX_ATTEMPTS = 5;

export type OutboxItemType = "timer_start" | "timer_stop" | "time_entry_create";

export type OutboxItem = {
  id: string;
  type: OutboxItemType;
  jobId?: string;
  payload: any;
  createdAtISO: string;
  attempts: number;
  lastError?: string;
  idempotencyKey?: string;
};

export async function loadOutbox(): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveOutbox(items: OutboxItem[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

export async function enqueue(item: Omit<OutboxItem, "attempts" | "createdAtISO"> & { createdAtISO?: string }): Promise<void> {
  const items = await loadOutbox();
  items.push({
    ...item,
    attempts: 0,
    createdAtISO: item.createdAtISO || new Date().toISOString(),
  });
  await saveOutbox(items);
}

export async function removeItem(id: string): Promise<void> {
  const items = await loadOutbox();
  await saveOutbox(items.filter((i) => i.id !== id));
}

type FlushResult = { processed: number; failed: number; remaining: number };

/**
 * Process outbox items sequentially.
 * Stops on network failure or auth failure (401 after rotate).
 */
export async function flushOutbox(): Promise<FlushResult> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    const items = await loadOutbox();
    return { processed: 0, failed: 0, remaining: items.length };
  }

  const items = await loadOutbox();
  let processed = 0;
  let failed = 0;
  const remaining: OutboxItem[] = [];

  for (const item of items) {
    if (item.attempts >= MAX_ATTEMPTS) {
      // Keep in outbox but don't retry — surface error
      remaining.push(item);
      failed++;
      continue;
    }

    try {
      const success = await processItem(item);
      if (success) {
        processed++;
      } else {
        // Non-retryable (e.g. 401 after rotate) — stop flush
        remaining.push(item);
        // Push all remaining unprocessed items
        const idx = items.indexOf(item);
        remaining.push(...items.slice(idx + 1));
        break;
      }
    } catch (e: any) {
      item.attempts++;
      item.lastError = e?.message || "Unknown error";
      remaining.push(item);
      failed++;
      // Network error — stop processing
      if (e?.message?.includes("Network") || e?.message?.includes("fetch")) {
        remaining.push(...items.slice(items.indexOf(item) + 1));
        break;
      }
    }
  }

  await saveOutbox(remaining);
  return { processed, failed, remaining: remaining.length };
}

/**
 * Returns true if item was successfully processed, false if auth failure (should stop).
 * Throws on network/transient errors.
 */
async function processItem(item: OutboxItem): Promise<boolean> {
  let res: Response;

  switch (item.type) {
    case "timer_start":
      res = await apiFetch("/api/engineer/timer/start", {
        method: "POST",
        body: JSON.stringify({ jobId: item.jobId, ...item.payload }),
      });
      break;

    case "timer_stop":
      res = await apiFetch("/api/engineer/timer/stop", {
        method: "POST",
      });
      break;

    case "time_entry_create": {
      const headers: Record<string, string> = {};
      if (item.idempotencyKey) {
        headers["idempotency-key"] = item.idempotencyKey;
      }
      res = await apiFetch("/api/engineer/time-entries", {
        method: "POST",
        headers,
        body: JSON.stringify(item.payload),
      });
      break;
    }

    default:
      // Unknown type — remove from outbox
      return true;
  }

  if (res.status === 401) {
    // Auth failure — apiFetch already tried rotate. Stop flush.
    return false;
  }

  if (res.ok || res.status === 409) {
    // 409 = already exists / conflict — treat as success (idempotent)
    return true;
  }

  // Server error — throw to trigger retry
  const body = await res.json().catch(() => ({}));
  throw new Error(body?.error || `HTTP ${res.status}`);
}
