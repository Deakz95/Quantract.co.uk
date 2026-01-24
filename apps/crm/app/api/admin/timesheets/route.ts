import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { listTimesheets } from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    await requireRole("admin");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const ctx = await requireRole("admin");
    if (!ctx.companyId) {
      return NextResponse.json({
        ok: false,
        error: 'No company context',
        message: 'No company context'
      }, { status: 401 });
    }
    const companyId = ctx.companyId;
    const items = await listTimesheets({ companyId, status });
    return NextResponse.json({
      items
    });
  } catch (err: any) {
    const errorMessage = err?.message || "Unauthorized";
    return NextResponse.json({
      error: errorMessage,
      message: errorMessage
    }, {
      status: err?.status || 401
    });
  }
});
