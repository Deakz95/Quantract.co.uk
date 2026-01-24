import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import { rejectTimesheet } from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const POST = withRequestLogging(async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");
    const approver = (await getUserEmail()) || "admin";
    const body = await req.json().catch(() => ({}));
    const reason = body.reason ? String(body.reason) : undefined;
    const { id } = await getRouteParams(ctx);
    const sheet = await rejectTimesheet(id, approver, reason);
    if (!sheet) return NextResponse.json({
      error: "Not found"
    }, {
      status: 404
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
