export type Role = "admin" | "client" | "engineer";

/**
 * Demo session cookie helpers (client-side).
 * Later we’ll replace this with real httpOnly cookies set by the backend.
 */
const COOKIE_NAME = "qt_session";

export function setRoleCookie(role: Role) {
  if (typeof document === "undefined") return;
  // demo format: role:admin
  document.cookie = `${COOKIE_NAME}=role:${role}; path=/; samesite=lax`;
}

export function clearRoleCookie() {
  if (typeof document === "undefined") return;
  // expire it
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
}

export function parseSession(cookieValue?: string | null): { role: Role } | null {
  if (!cookieValue) return null;
  const m = cookieValue.match(/^role:(admin|client|engineer)$/);
  if (!m) return null;
  return { role: m[1] as Role };
}
