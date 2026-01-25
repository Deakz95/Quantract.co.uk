export type Role = "admin" | "client" | "engineer";

/**
 * DEPRECATED: Demo session cookie helpers (client-side).
 *
 * WARNING: These functions are disabled in production to prevent
 * client-side cookie manipulation that could interfere with
 * server-managed httpOnly session cookies.
 *
 * In production, all session management is handled server-side via:
 * - /api/auth/password/login
 * - /api/auth/magic-link/request
 * - Server-set httpOnly cookies
 */

// Detect production environment on client side
const IS_PRODUCTION =
  typeof window !== "undefined"
    ? window.location.hostname !== "localhost" && !window.location.hostname.includes("127.0.0.1")
    : process.env.NODE_ENV === "production";

// Legacy cookie name - NOT the same as the httpOnly server cookies
const COOKIE_NAME = "qt_session";

/**
 * @deprecated Use server-side authentication instead.
 * This function is disabled in production.
 */
export function setRoleCookie(role: Role) {
  if (typeof document === "undefined") return;

  // Disabled in production - all auth cookies are httpOnly and set server-side
  if (IS_PRODUCTION) {
    console.warn("[auth] setRoleCookie is disabled in production. Use /api/auth/password/login instead.");
    return;
  }

  // Dev only: set demo cookie (this is NOT the httpOnly session cookie)
  document.cookie = `${COOKIE_NAME}=role:${role}; path=/; samesite=lax; max-age=86400`;
}

/**
 * @deprecated Use server-side logout instead (/api/auth/logout).
 * This function is disabled in production.
 */
export function clearRoleCookie() {
  if (typeof document === "undefined") return;

  // Always allow clearing (safe operation)
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
}

/**
 * Parse a session cookie value. Safe to use in any environment.
 */
export function parseSession(cookieValue?: string | null): { role: Role } | null {
  if (!cookieValue) return null;
  const m = cookieValue.match(/^role:(admin|client|engineer)$/);
  if (!m) return null;
  return { role: m[1] as Role };
}
