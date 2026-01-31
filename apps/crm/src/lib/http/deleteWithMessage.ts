/**
 * Shared helper for DELETE requests that surfaces server error messages.
 * Throws an Error whose `.message` is the server-provided message on failure.
 */
export async function deleteWithMessage(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.message || body?.error || "Delete failed";
    throw new Error(msg);
  }
  // Sanity: server should always confirm deleted:true on 2xx
  if (body && body.deleted === false) {
    throw new Error("Server did not confirm deletion");
  }
}

/** Result type for bulk delete aggregation */
export interface BulkDeleteResult {
  deleted: number;
  blocked: number;
  messages: string[];
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
  let deleted = 0;
  let blocked = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      deleted++;
    } else {
      blocked++;
      if (r.reason?.message) messages.push(r.reason.message);
    }
  }
  return { deleted, blocked, messages };
}
