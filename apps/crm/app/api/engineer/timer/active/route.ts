import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
export const GET = withRequestLogging(async function GET() {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email) return NextResponse.json({
      ok: false,
      error: "Missing engineer email"
    }, {
      status: 401
    });
    const active = await repo.getEngineerActiveTimer(email);
    return NextResponse.json({
      ok: true,
      active
    });
  } catch (e: any) {
    const msg = e?.message || "Unauthorized";
    return NextResponse.json({
      ok: false,
      error: msg
    }, {
      status: e?.status || 401
    });
  }
});
