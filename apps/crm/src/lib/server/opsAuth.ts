import crypto from "node:crypto";
import { rateLimit } from "@/lib/rateLimit";

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
// ---------------------------------------------------------------------------
// Ops rate limiting — keyed on client IP + route
// ---------------------------------------------------------------------------

const OPS_READ_LIMIT = { limit: 30, windowMs: 60 * 1000 }; // 30/min
const OPS_WRITE_LIMIT = { limit: 5, windowMs: 60 * 1000 }; // 5/min

/**
 * Rate-limit an ops read request by client IP.
 * Returns null if allowed, or a JSON 429 Response if exceeded.
 */
export function opsRateLimitRead(req: Request, route: string): Response | null {
  const ip = getClientIp(req) ?? "unknown";
  const result = rateLimit({ key: `ops:read:${route}:${ip}`, ...OPS_READ_LIMIT });
  if (!result.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: "rate_limit_exceeded", retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } },
    );
  }
  return null;
}

/**
 * Rate-limit an ops write request by client IP (stricter).
 * Returns null if allowed, or a JSON 429 Response if exceeded.
 */
export function opsRateLimitWrite(req: Request, route: string): Response | null {
  const ip = getClientIp(req) ?? "unknown";
  const result = rateLimit({ key: `ops:write:${route}:${ip}`, ...OPS_WRITE_LIMIT });
  if (!result.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: "rate_limit_exceeded", retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000) }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) } },
    );
  }
  return null;
}

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
