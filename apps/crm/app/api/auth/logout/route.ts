import { NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { clearSession, requireAuth } from "@/lib/serverAuth";
import { revokeSession } from "@/lib/server/authDb";

export const POST = withRequestLogging(async function POST() {
  try {
    const ctx = await requireAuth();
    await revokeSession(ctx.sessionId);
  } catch {
    // If not authenticated, still clear the session cookie
  }
  await clearSession();
  return NextResponse.json({ ok:true });
});
