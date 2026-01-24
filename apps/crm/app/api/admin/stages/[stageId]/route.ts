import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const PATCH = withRequestLogging(async function PATCH(req: Request, ctx: { params: Promise<{ stageId: string }> }) {
  await requireRole("admin");
  const { stageId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => ({}))) as any;
  const status = String(body?.status || "").trim();
  if (!status) return NextResponse.json({
    ok: false,
    error: "missing_status"
  }, {
    status: 400
  });
  const updated = await repo.updateJobStage(stageId, {
    status: status as any
  });
  if (!updated) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });
  return NextResponse.json({
    ok: true,
    stage: updated
  });
});
