import { NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { validateMagicLink, createSession } from "@/lib/server/authDb";
import { setSession, setUserEmail, setCompanyId, setProfileComplete } from "@/lib/serverAuth";

function getBaseUrl(req: Request): string {
  if (process.env.NEXT_PUBLIC_APP_ORIGIN) {
    return process.env.NEXT_PUBLIC_APP_ORIGIN;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_ORIGIN must be set in production");
  }
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function redirectTo(req: Request, path: string, reason?: string) {
  console.log("[magic-link/verify] Redirecting to:", path, reason ? `reason=${reason}` : "(success)");
  return NextResponse.redirect(new URL(path, getBaseUrl(req)));
}

/**
 * GET: Redirect to landing page (does NOT consume token).
 * This prevents email client prefetching from consuming the token.
 */
export const GET = withRequestLogging(async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const remember = url.searchParams.get("remember") || "";

  if (!token) {
    return redirectTo(req, "/auth/error?reason=missing_token", "missing_token");
  }

  // Redirect to landing page - token will be consumed on POST
  const params = new URLSearchParams({ token });
  if (remember) params.set("remember", remember);
  return redirectTo(req, `/auth/verify?${params.toString()}`);
});

/**
 * POST: Actually consume the token and create session.
 * Called from the landing page when user clicks "Sign in".
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token || "";
    const rememberMe = body.remember === true || body.remember === "1";

    if (!token) {
      return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
    }

    const result = await validateMagicLink(token);

    if (!result.ok) {
      const reason = result.error === "Invalid link" ? "invalid_token"
        : result.error === "Link expired" ? "expired"
        : result.error === "Link already used" ? "already_used"
        : "unknown";
      return NextResponse.json({ ok: false, error: reason }, { status: 400 });
    }

    const user = result.user;
    const session = await createSession(user.id, rememberMe);

    await setSession(user.role as any, { sessionId: session.id });
    await setUserEmail(user.email);
    if (user.companyId) await setCompanyId(user.companyId);
    await setProfileComplete(Boolean((user as any).profileComplete));

    // Return success with redirect URL
    const role = user.role;
    const redirectUrl = role === "admin" ? "/admin/dashboard"
      : role === "engineer" ? "/engineer"
      : "/client";

    return NextResponse.json({ ok: true, redirectUrl });
  } catch (e) {
    console.error("[magic-link/verify] POST Error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
});
