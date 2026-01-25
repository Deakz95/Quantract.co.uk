import { NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { consumeMagicLink, createSession } from "@/lib/server/authDb";
import { setSession, setUserEmail, setCompanyId, setProfileComplete } from "@/lib/serverAuth";

function redirectTo(req: Request, path: string) {
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;
  return NextResponse.redirect(new URL(path, base));
}

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    const rememberMe = url.searchParams.get("remember") === "1";
    if (!token) return redirectTo(req, "/auth/error?reason=missing");

    const result = await consumeMagicLink(token);
    if (!result.ok) return redirectTo(req, `/auth/error?reason=${encodeURIComponent(result.error)}`);

    const user = result.user;
    const session = await createSession(user.id, rememberMe);

    await setSession(user.role as any, { sessionId: session.id });
    await setUserEmail(user.email);
    if (user.companyId) await setCompanyId(user.companyId);
    await setProfileComplete(Boolean((user as any).profileComplete));

    const role = user.role;
    if (role === "admin") return redirectTo(req, "/admin/dashboard");
    if (role === "engineer") return redirectTo(req, "/engineer");
    return redirectTo(req, "/client");
  } catch (e) {
    console.error("[magic-link/verify] Error:", e);
    return redirectTo(req, "/auth/error?reason=server_error");
  }
});
