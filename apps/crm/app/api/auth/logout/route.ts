import { NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { clearSession, getAuthContext } from "@/lib/serverAuth";
import { revokeSession } from "@/lib/server/authDb";

export const POST = withRequestLogging(async function POST() {
  const ctx = await getAuthContext();
  if (ctx) {
    await revokeSession(ctx.sessionId);
  }
  await clearSession();
  return NextResponse.json({ ok:true });
});
