import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const GET = withRequestLogging(async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  await requireRole("admin");
  const { jobId } = await getRouteParams(ctx);
  const variations = await repo.listVariationsForJob(jobId);
  return NextResponse.json({
    ok: true,
    variations
  });
});
export const POST = withRequestLogging(async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  await requireRole("admin");
  const { jobId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => ({}))) as any;
  const title = String(body?.title || "").trim();
  const reason = String(body?.reason || "").trim() || undefined;
  const notes = typeof body?.notes === "string" ? String(body.notes) : undefined;
  const stageId = typeof body?.stageId === "string" ? String(body.stageId).trim() : undefined;
  const vatRate = typeof body?.vatRate === "number" ? body.vatRate : undefined;
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!title) return NextResponse.json({
    ok: false,
    error: "missing_title"
  }, {
    status: 400
  });
  if (!items.length) return NextResponse.json({
    ok: false,
    error: "missing_items"
  }, {
    status: 400
  });
  try {
    const v = await repo.createVariationForJob({
      jobId,
      title,
      reason,
      notes,
      stageId,
      vatRate,
      items
    });
    if (!v) return NextResponse.json({
      ok: false,
      error: "not_found"
    }, {
      status: 404
    });
    return NextResponse.json({
      ok: true,
      variation: v
    });
  } catch (err: any) {
    console.error("[POST variations] error:", err?.message ?? err, err?.stack);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
});
