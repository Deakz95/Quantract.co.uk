import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { rateLimitEngineerWrite, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";
export const POST = withRequestLogging(async function POST() {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email) return NextResponse.json({
      ok: false,
      error: "Missing engineer email"
    }, {
      status: 401
    });
    // Rate limit by authenticated user
    const rl = rateLimitEngineerWrite(email);
    if (!rl.ok) return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });
    const stopped = await repo.stopEngineerTimer(email);
    return NextResponse.json({
      ok: true,
      stopped
    });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[POST /api/engineer/timer/stop]", e);
    return NextResponse.json({ ok: false, error: "Could not stop timer. Please try again." }, { status: 500 });
  }
});
