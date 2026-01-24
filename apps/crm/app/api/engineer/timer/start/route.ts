import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email) return NextResponse.json({
      ok: false,
      error: "Missing engineer email"
    }, {
      status: 401
    });
    const body = (await req.json().catch(() => ({}))) as any;
    const jobId = String(body?.jobId || "").trim();
    const notes = body?.notes ? String(body.notes) : undefined;
    if (!jobId) return NextResponse.json({
      ok: false,
      error: "jobId is required"
    }, {
      status: 400
    });
    const result = await repo.startEngineerTimer({
      engineerEmail: email,
      jobId,
      notes
    });
    return NextResponse.json({
      ok: true,
      ...result
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
