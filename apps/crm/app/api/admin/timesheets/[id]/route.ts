import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { getTimesheetById } from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const GET = withRequestLogging(async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");
    const { id } = await getRouteParams(ctx);
    const sheet = await getTimesheetById(id);
    if (!sheet) return NextResponse.json({
      error: "Not found"
    }, {
      status: 404
    });
    return NextResponse.json({
      item: sheet
    });
  } catch (error: unknown) {
    return NextResponse.json({
      error: (error as { message?: string })?.message || "Unauthorized"
    }, {
      status: (error as { status?: number })?.status || 401
    });
  }
});
