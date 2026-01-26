import { NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { consumeMagicLink, createSession } from "@/lib/server/authDb";
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

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    const rememberMe = url.searchParams.get("remember") === "1";

    // Missing token
    if (!token) {
      return redirectTo(req, "/auth/error?reason=missing_token", "missing_token");
    }

    const result = await consumeMagicLink(token);

    // Token not found / invalid
    if (!result.ok) {
      const reason = result.error === "Invalid link" ? "invalid_token"
        : result.error === "Link expired" ? "expired"
        : result.error === "Link already used" ? "already_used"
        : "unknown";
      return redirectTo(req, `/auth/error?reason=${reason}`, reason);
    }

    const user = result.user;
    const session = await createSession(user.id, rememberMe);

    await setSession(user.role as any, { sessionId: session.id });
    await setUserEmail(user.email);
    if (user.companyId) await setCompanyId(user.companyId);
    await setProfileComplete(Boolean((user as any).profileComplete));

    // Success - redirect to dashboard based on role
    const role = user.role;
    if (role === "admin") return redirectTo(req, "/admin/dashboard");
    if (role === "engineer") return redirectTo(req, "/engineer");
    return redirectTo(req, "/client");
  } catch (e) {
    console.error("[magic-link/verify] Error:", e);
    return redirectTo(req, "/auth/error?reason=server_error", "server_error");
  }
});
