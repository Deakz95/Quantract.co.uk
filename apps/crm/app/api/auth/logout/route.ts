import { NextRequest, NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { clearSession, requireAuth } from "@/lib/serverAuth";
import { revokeSession } from "@/lib/server/authDb";

export const POST = withRequestLogging(async function POST(req: NextRequest) {
  const t0 = Date.now();
  let userId: string | undefined;
  let ok = false;

  try {
    // 1. Revoke custom session
    try {
      const ctx = await requireAuth();
      userId = ctx.userId;
      await revokeSession(ctx.sessionId);
    } catch {
      // Not authenticated via custom session — continue
    }

    // 2. Call Better Auth / Neon Auth sign-out to destroy server session
    try {
      const host = req.headers.get("host") || "localhost:3000";
      const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
      const baseUrl = `${proto}://${host}`;
      const cookie = req.headers.get("cookie") ?? "";

      const baRes = await fetch(`${baseUrl}/api/auth/sign-out`, {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: "{}",
      });

      // Forward Set-Cookie headers from Better Auth sign-out
      const res = NextResponse.json({ ok: true });
      const setCookies = baRes.headers.getSetCookie?.() ?? [];
      for (const sc of setCookies) {
        res.headers.append("set-cookie", sc);
      }
    } catch {
      // Better Auth not configured or unreachable — continue with cookie clearing
    }

    // 3. Clear all session cookies (custom + Better Auth + Neon Auth)
    await clearSession();
    ok = true;

    if (process.env.PERF_LOGS === "1") {
      console.info(`[perf] logout { ok:true, msTotal:${Date.now() - t0}, userId:${userId || "unknown"} }`);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (process.env.PERF_LOGS === "1") {
      console.info(`[perf] logout { ok:false, msTotal:${Date.now() - t0}, error:${e instanceof Error ? e.message : "unknown"} }`);
    }
    // Still try to clear cookies even on error
    await clearSession().catch(() => {});
    return NextResponse.json({ ok: false, message: "Logout failed. Please retry." }, { status: 500 });
  }
});
