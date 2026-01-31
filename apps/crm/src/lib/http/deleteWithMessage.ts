/** Undo data returned from soft-delete endpoints */
export interface UndoData {
  token: string;
  payload: { entityType: string; entityId: string; undoUntil: string; companyId: string; userId: string };
}

/** Result from a single delete request */
export interface DeleteResult {
  undo?: UndoData;
}

/**
 * Shared helper for DELETE requests that surfaces server error messages.
 * Throws an Error whose `.message` is the server-provided message on failure.
 * Returns undo data if server provides it (soft-delete).
 */
export async function deleteWithMessage(url: string): Promise<DeleteResult> {
  const res = await fetch(url, { method: "DELETE" });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.message || body?.error || "Delete failed";
    throw new Error(msg);
  }
  if (body && body.deleted === false) {
    throw new Error("Server did not confirm deletion");
  }
  return { undo: body?.undo ?? undefined };
}

/** Result type for bulk delete aggregation */
export interface BulkDeleteResult {
  deleted: number;
  blocked: number;
  messages: string[];
  undos: UndoData[];
}

/**
 * Delete multiple resources and aggregate results.
 * Never short-circuits — every ID is attempted.
 */
export async function bulkDeleteWithSummary(
  ids: string[],
  urlFn: (id: string) => string,
): Promise<BulkDeleteResult> {
  const results = await Promise.allSettled(
    ids.map((id) => deleteWithMessage(urlFn(id))),
  );
  const messages: string[] = [];
  const undos: UndoData[] = [];
  let deleted = 0;
  let blocked = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      deleted++;
      if (r.value.undo) undos.push(r.value.undo);
    } else {
      blocked++;
      if (r.reason?.message) messages.push(r.reason.message);
    }
  }
  return { deleted, blocked, messages, undos };
}
