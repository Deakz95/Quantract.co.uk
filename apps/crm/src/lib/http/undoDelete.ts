import type { UndoData } from "./deleteWithMessage";

/**
 * Call the undo-delete endpoint to restore a soft-deleted entity.
 * Returns true on success, throws on failure.
 */
export async function undoDelete(undo: UndoData): Promise<boolean> {
  const res = await fetch("/api/admin/undo-delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: undo.token, payload: undo.payload }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || "Undo failed");
  }
  return true;
}

/** Result from a bulk undo-all operation */
export interface BulkUndoResult {
  total: number;
  restored: number;
  failed: number;
}

/**
 * Undo multiple soft-deletes concurrently.
 * Returns counts for result messaging.
 */
export async function bulkUndoAll(undos: UndoData[]): Promise<BulkUndoResult> {
  const results = await Promise.allSettled(undos.map((u) => undoDelete(u)));
  const restored = results.filter((r) => r.status === "fulfilled").length;
  return { total: undos.length, restored, failed: undos.length - restored };
}
