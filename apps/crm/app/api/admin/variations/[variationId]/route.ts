import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ variationId: string }> }) {
  await requireRole("admin");
  const { variationId } = await getRouteParams(ctx);
  const variation = await repo.getVariationById(variationId);
  if (!variation) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });
  const attachments = (await repo.listVariationAttachments(variationId)).map((att) => ({
    id: att.id,
    name: att.name,
    mimeType: att.mimeType,
    createdAtISO: att.createdAtISO,
  }));
  return NextResponse.json({
    ok: true,
    variation,
    attachments
  });
});
export const PATCH = withRequestLogging(
  async function PATCH(req: Request, ctx: { params: Promise<{ variationId: string }> }) {
  await requireRole("admin");
  const { variationId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => ({}))) as any;
  const title = typeof body?.title === "string" ? String(body.title).trim() : undefined;
  const reason = typeof body?.reason === "string" ? String(body.reason) : body?.reason === null ? null : undefined;
  const notes = typeof body?.notes === "string" ? String(body.notes) : body?.notes === null ? null : undefined;
  const stageId = typeof body?.stageId === "string" ? String(body.stageId).trim() : body?.stageId === null ? null : undefined;
  const vatRate = typeof body?.vatRate === "number" ? body.vatRate : undefined;
  const items = Array.isArray(body?.items) ? body.items : undefined;
  const variation = await repo.updateVariationDraft({
    id: variationId,
    title,
    reason,
    notes,
    stageId,
    vatRate,
    items
  });
  if (!variation) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });
  return NextResponse.json({
    ok: true,
    variation
  });
});
