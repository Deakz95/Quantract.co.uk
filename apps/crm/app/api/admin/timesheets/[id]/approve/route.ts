import { NextResponse } from "next/server";
import { requireRole, getUserEmail, getCompanyId } from "@/lib/serverAuth";
import { approveTimesheet } from "@/lib/server/repo";
import { logCriticalAction, withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const POST = withRequestLogging(async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");
    const approver = (await getUserEmail()) || "admin";
    const { id } = await getRouteParams(ctx);
    const sheet = await approveTimesheet(id, approver);
    if (!sheet) return NextResponse.json({
      error: "Not found"
    }, {
      status: 404
    });
    const companyId = await getCompanyId();
    logCriticalAction({
      name: "timesheet.approved",
      companyId,
      metadata: {
        timesheetId: sheet.id,
        approver
      }
    });
    return NextResponse.json({
      timesheet: sheet
    });
  } catch (error: unknown) {
    return NextResponse.json({
      error: (error as { message?: string })?.message || "Unauthorized"
    }, {
      status: (error as { status?: number })?.status || 401
    });
  }
});
