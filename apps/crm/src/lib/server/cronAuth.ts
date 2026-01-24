import crypto from "node:crypto";

type CronAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

type IdempotencyResult =
  | { ok: true; duplicate: false; key: string | null }
  | { ok: false; duplicate: true; key: string };

const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;
const idempotencyStore = new Map<string, number>();

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function checkCronAuth(req: Request): CronAuthResult {
  const secret = process.env.QT_CRON_SECRET;
  if (!secret) {
    return { ok: false, status: 500, error: "missing_cron_secret" };
  }
  const authHeader = req.headers.get("AUTH") ?? req.headers.get("auth") ?? "";
  if (!authHeader) {
    return { ok: false, status: 401, error: "missing_auth" };
  }
  if (!safeEqual(authHeader, secret)) {
    return { ok: false, status: 401, error: "invalid_auth" };
  }
  return { ok: true };
}

export function checkIdempotency(action: string, key: string | null): IdempotencyResult {
  const now = Date.now();
  for (const [storedKey, timestamp] of idempotencyStore.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(storedKey);
    }
  }

  if (!key) {
    return { ok: true, duplicate: false, key: null };
  }

  const composite = `${action}:${key}`;
  const existing = idempotencyStore.get(composite);
  if (existing && now - existing < IDEMPOTENCY_TTL_MS) {
    return { ok: false, duplicate: true, key };
  }
  idempotencyStore.set(composite, now);
  return { ok: true, duplicate: false, key };
}

export function getIdempotencyKey(req: Request) {
  return req.headers.get("Idempotency-Key") ?? req.headers.get("idempotency-key") ?? null;
}

export function getCompanyHeader(req: Request) {
  return req.headers.get("X-Company-Id") ?? req.headers.get("x-company-id") ?? null;
}
