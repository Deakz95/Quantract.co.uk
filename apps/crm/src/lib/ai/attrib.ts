/** Digest attribution token stored in sessionStorage. */
export interface DigestAttrib {
  source: "weekly_digest";
  startedAt: number;
  recId?: string;
  actionId?: string;
}

export const ATTRIB_KEY = "qt_ai_digest_attrib";
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function storeAttrib(attrib: DigestAttrib): void {
  try {
    sessionStorage.setItem(ATTRIB_KEY, JSON.stringify(attrib));
  } catch {
    // storage full or unavailable
  }
}

export function loadAttrib(): DigestAttrib | null {
  try {
    const raw = sessionStorage.getItem(ATTRIB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.source === "weekly_digest" &&
      typeof parsed.startedAt === "number" &&
      Date.now() - parsed.startedAt < MAX_AGE_MS
    ) {
      return parsed as DigestAttrib;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearAttrib(): void {
  try {
    sessionStorage.removeItem(ATTRIB_KEY);
  } catch {
    // ignore
  }
}

/** Server-side: validate attrib shape from untrusted request body. */
export function validateAttrib(val: unknown): DigestAttrib | null {
  if (!val || typeof val !== "object") return null;
  const v = val as Record<string, unknown>;
  if (v.source !== "weekly_digest") return null;
  if (typeof v.startedAt !== "number" || !isFinite(v.startedAt)) return null;
  if (Date.now() - v.startedAt > MAX_AGE_MS) return null;
  return {
    source: "weekly_digest",
    startedAt: v.startedAt,
    recId: typeof v.recId === "string" ? v.recId.slice(0, 80) : undefined,
    actionId: typeof v.actionId === "string" ? v.actionId.slice(0, 80) : undefined,
  };
}
