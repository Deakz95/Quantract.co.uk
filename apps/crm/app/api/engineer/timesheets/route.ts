import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import { getOrCreateTimesheet, listTimeEntriesForEngineerWeek, submitTimesheet } from "@/lib/server/repo";
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
    const sheet = await getOrCreateTimesheet(email, weekStart);
    const entries = await listTimeEntriesForEngineerWeek(email, weekStart);
    return NextResponse.json({
      timesheet: sheet,
      entries
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err?.message || "Unauthorized"
    }, {
      status: err?.status || 401
    });
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
    const weekStart = String(body.weekStart || new Date().toISOString());
    const sheet = await submitTimesheet(email, weekStart);
    if (!sheet) return NextResponse.json({
      error: "Failed to submit timesheet"
    }, {
      status: 500
    });
    return NextResponse.json({
      timesheet: sheet
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err?.message || "Unauthorized"
    }, {
      status: err?.status || 401
    });
  }
});
