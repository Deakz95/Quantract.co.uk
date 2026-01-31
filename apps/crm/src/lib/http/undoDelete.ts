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
