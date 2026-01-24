/**
 * Best-effort base URL for server-side code.
 * (No dependency on next/headers because some Next type setups don't expose it.)
 */
export function requestBaseUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_URL ||
    "";

  if (env) {
    const v = String(env).trim();
    if (v.startsWith("http://") || v.startsWith("https://")) return v.replace(/\/$/, "");
    return `https://${v.replace(/\/$/, "")}`; // e.g. VERCEL_URL
  }

  return "http://localhost:3000";
}
