export const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export function extractCookies(res) {
  const headerValues =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : res.headers.get("set-cookie")
        ? [res.headers.get("set-cookie")]
        : [];

  return headerValues
    .flatMap((value) => String(value || "").split(/,(?=[^;]+?=)/g))
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean);
}

export async function login(role, email) {
  const res = await fetch(`${baseURL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role, email, password: "demo123" }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed: ${res.status} ${body}`);
  }

  return extractCookies(res);
}

export function toCookieHeader(values) {
  return values.filter(Boolean).join("; ");
}
