/**
 * Offline outbox — queues mutations when the device is offline and flushes when connected.
 *
 * Conflict strategy: server-authority, last-write-wins.
 * 409 is treated as success (idempotent). Engineers do not resolve conflicts;
 * server state is canonical. If the backend uses 409 for non-idempotent failures
 * in the future, those endpoints should return a different status code.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { apiFetch, apiFetchMultipart } from "../api/client";

const OUTBOX_KEY = "qt_outbox_v1";
const MAX_ATTEMPTS = 5;

export type OutboxItemType =
  | "timer_start"
  | "timer_stop"
  | "time_entry_create"
  | "certificate_draft_save"
  | "certificate_complete"
  | "snag_update"
  | "job_complete"
  | "photo_upload"
  | "receipt_upload"
  | "check_complete"
  | "cost_item_create"
  | "dispatch_status_update"
  | "qr_tag_assign";

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

function backoffMs(attempts: number): number {
  return Math.min(Math.pow(2, attempts) * 1000, 30000);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type FlushResult = { processed: number; failed: number; remaining: number };

/**
 * Process outbox items sequentially.
 * Stops on network failure or auth failure (401 after rotate).
 * Uses exponential backoff between retries.
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

    // Exponential backoff for items that have failed before
    if (item.attempts > 0) {
      await delay(backoffMs(item.attempts));
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

    case "certificate_draft_save": {
      res = await apiFetch(`/api/engineer/certificates/${item.payload.certificateId}`, {
        method: "PATCH",
        body: JSON.stringify({
          data: item.payload.data,
          type: item.payload.type,
          testResults: item.payload.testResults,
          expectedUpdatedAt: item.payload.expectedUpdatedAt,
        }),
      });
      // 409 for draft saves = conflict, NOT idempotent success — surface as error
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === "conflict") {
          item.attempts = MAX_ATTEMPTS;
          item.lastError = "Conflict — certificate was modified on another device";
          throw new Error(item.lastError);
        }
      }
      break;
    }

    case "certificate_complete":
      res = await apiFetch(`/api/engineer/certificates/${item.payload.certificateId}/complete`, {
        method: "POST",
      });
      break;

    case "snag_update":
      res = await apiFetch(`/api/engineer/snag-items/${item.payload.snagId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: item.payload.status }),
      });
      break;

    case "job_complete":
      res = await apiFetch(`/api/engineer/jobs/${item.jobId}/complete`, {
        method: "POST",
      });
      break;

    case "photo_upload": {
      const { targetType, targetId, fileUri, mimeType, fileName } = item.payload;
      // Validate file URI is accessible before attempting upload
      try {
        await fetch(fileUri, { method: "HEAD" });
      } catch {
        // File URI is stale (OS cleaned up temp file) — mark as permanently failed
        item.attempts = MAX_ATTEMPTS;
        item.lastError = "Photo file no longer available — please retake the photo";
        throw new Error(item.lastError);
      }
      const formData = new FormData();
      formData.append("file", {
        uri: fileUri,
        type: mimeType || "image/jpeg",
        name: fileName || "photo.jpg",
      } as any);
      if (item.payload.name) formData.append("name", item.payload.name);
      if (item.payload.category) formData.append("category", item.payload.category);
      if (item.idempotencyKey) formData.append("idempotencyKey", item.idempotencyKey);

      const path = targetType === "certificate"
        ? `/api/engineer/certificates/${targetId}/attachments`
        : `/api/engineer/jobs/${targetId}/photos`;
      res = await apiFetchMultipart(path, formData);
      break;
    }

    case "receipt_upload": {
      // Validate file URI is accessible before attempting upload
      try {
        await fetch(item.payload.fileUri, { method: "HEAD" });
      } catch {
        item.attempts = MAX_ATTEMPTS;
        item.lastError = "Receipt photo no longer available — please recapture";
        throw new Error(item.lastError);
      }
      const fd = new FormData();
      fd.append("file", {
        uri: item.payload.fileUri,
        type: item.payload.mimeType || "image/jpeg",
        name: item.payload.fileName || "receipt.jpg",
      } as any);
      if (item.payload.category) fd.append("category", item.payload.category);
      if (item.payload.amount) fd.append("amount", String(item.payload.amount));
      if (item.payload.vat) fd.append("vat", String(item.payload.vat));
      if (item.payload.supplierName) fd.append("supplierName", item.payload.supplierName);
      if (item.payload.notes) fd.append("notes", item.payload.notes);
      if (item.payload.jobId) fd.append("jobId", item.payload.jobId);
      if (item.idempotencyKey) fd.append("idempotencyKey", item.idempotencyKey);
      res = await apiFetchMultipart("/api/engineer/receipts", fd);
      break;
    }

    case "check_complete": {
      const headers: Record<string, string> = {};
      if (item.idempotencyKey) {
        headers["idempotency-key"] = item.idempotencyKey;
      }
      res = await apiFetch("/api/engineer/checks", {
        method: "POST",
        headers,
        body: JSON.stringify(item.payload),
      });
      break;
    }

    case "cost_item_create": {
      const headers: Record<string, string> = {};
      if (item.idempotencyKey) {
        headers["idempotency-key"] = item.idempotencyKey;
      }
      res = await apiFetch(`/api/engineer/jobs/${item.jobId}/cost-items`, {
        method: "POST",
        headers,
        body: JSON.stringify(item.payload),
      });
      break;
    }

    case "dispatch_status_update": {
      res = await apiFetch("/api/engineer/dispatch/status", {
        method: "POST",
        body: JSON.stringify({
          entryId: item.payload.entryId,
          status: item.payload.status,
          idempotencyKey: item.idempotencyKey,
        }),
      });
      break;
    }

    case "qr_tag_assign": {
      const headers: Record<string, string> = {};
      if (item.idempotencyKey) {
        headers["idempotency-key"] = item.idempotencyKey;
      }
      res = await apiFetch("/api/engineer/qr-tags/assign", {
        method: "POST",
        headers,
        body: JSON.stringify({
          code: item.payload.code,
          certificateId: item.payload.certificateId,
        }),
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

  // Rate limited — respect Retry-After and throw to trigger backoff retry
  if (res.status === 429) {
    const retryAfter = res.headers.get("retry-after");
    const waitSecs = retryAfter ? parseInt(retryAfter, 10) : 30;
    throw new Error(`Rate limited — retry after ${waitSecs}s`);
  }

  // Storage full — non-retryable for photo uploads
  if (res.status === 413 || res.status === 422) {
    const body = await res.json().catch(() => ({}));
    if (body?.error === "storage_limit_exceeded" || body?.code === "STORAGE_LIMIT_EXCEEDED") {
      // Mark as permanently failed — retrying won't help until admin upgrades plan
      item.attempts = MAX_ATTEMPTS;
      item.lastError = "Storage full \u2014 contact your admin to upgrade";
      throw new Error(item.lastError);
    }
  }

  // Server error — throw to trigger retry
  const body = await res.json().catch(() => ({}));
  throw new Error(body?.error || `HTTP ${res.status}`);
}
