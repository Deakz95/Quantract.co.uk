import crypto from "node:crypto";

type OpsAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Authenticate ops API requests via OPS_SECRET Bearer token.
 * Optionally validates caller IP against OPS_ALLOWED_IPS env var (comma-separated).
 */
export function checkOpsAuth(req: Request): OpsAuthResult {
  const secret = process.env.OPS_SECRET;
  if (!secret) {
    return { ok: false, status: 500, error: "missing_ops_secret" };
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  if (!token) {
    return { ok: false, status: 401, error: "missing_auth" };
  }

  if (!safeEqual(token, secret)) {
    return { ok: false, status: 401, error: "invalid_auth" };
  }

  // Optional IP allowlist
  const allowedIps = process.env.OPS_ALLOWED_IPS;
  if (allowedIps) {
    const clientIp = getClientIp(req);
    const allowed = allowedIps.split(",").map((ip) => ip.trim()).filter(Boolean);
    if (allowed.length > 0 && clientIp && !allowed.includes(clientIp)) {
      return { ok: false, status: 403, error: "ip_not_allowed" };
    }
  }

  return { ok: true };
}

/**
 * Extract client IP from platform-provided headers.
 * Uses x-forwarded-for (first entry) as the trusted source.
 */
function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0]?.trim() || null;
  }
  return null;
}

/**
 * Get client IP for logging purposes.
 */
export function getOpsClientIp(req: Request): string | null {
  return getClientIp(req);
}

/**
 * Validate the X-Approval-Token header for write operations.
 * Returns the token string if present, or null if missing.
 */
export function getApprovalToken(req: Request): string | null {
  return (
    req.headers.get("X-Approval-Token") ??
    req.headers.get("x-approval-token") ??
    null
  );
}

/**
 * Redact sensitive fields from payloads before persisting to OpsAuditLog.
 */
export function redactSensitive(obj: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!obj) return null;
  const REDACTED_KEYS = ["authorization", "x-approval-token", "ops_secret", "password", "secret", "token"];
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_KEYS.includes(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = value;
    }
  }
  return result;
}
