import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import { addTimeEntry, listTimeEntriesForEngineerWeek } from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email) return NextResponse.json({
      error: "Missing engineer email"
    }, {
      status: 401
    });
    const url = new URL(req.url);
    const weekStart = url.searchParams.get("weekStart") || new Date().toISOString();
    const rows = await listTimeEntriesForEngineerWeek(email, weekStart);
    return NextResponse.json({
      items: rows
    });
  } catch (err: any) {
    if (err?.status === 401) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    console.error("[engineer/time-entries]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
});
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email) return NextResponse.json({
      error: "Missing engineer email"
    }, {
      status: 401
    });
    const body = await req.json().catch(() => ({}));
    const jobId = String(body.jobId || "").trim();
    const startedAtISO = String(body.startedAtISO || "").trim();
    const endedAtISO = body.endedAtISO ? String(body.endedAtISO) : undefined;
    const breakMinutes = Number(body.breakMinutes ?? 0);
    const notes = body.notes ? String(body.notes) : undefined;
    if (!jobId || !startedAtISO) {
      return NextResponse.json({
        error: "jobId and startedAtISO are required"
      }, {
        status: 400
      });
    }
    const created = await addTimeEntry({
      jobId,
      engineerEmail: email,
      startedAtISO,
      endedAtISO,
      breakMinutes,
      notes
    });
    if (!created) return NextResponse.json({
      error: "Failed to create time entry"
    }, {
      status: 500
    });
    return NextResponse.json({
      item: created
    });
  } catch (err: any) {
    if (err?.status === 401) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    console.error("[engineer/time-entries]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
});
