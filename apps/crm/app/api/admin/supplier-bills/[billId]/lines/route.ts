import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(_req: Request, ctx: { params: Promise<{ billId: string }> }) {
  await requireRole("admin");
  const { billId } = await getRouteParams(ctx);
  const lines = await repo.listSupplierBillLines(billId);
  return NextResponse.json({
    ok: true,
    lines
  });
});
export const PUT = withRequestLogging(async function PUT(req: Request, ctx: { params: Promise<{ billId: string }> }) {
  await requireRole("admin");
  const { billId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => ({}))) as any;
  const items = Array.isArray(body.lines) ? body.lines : [];
  const cleaned = items.map((x: any) => ({
    id: x.id ? String(x.id) : undefined,
    description: String(x.description || "").trim(),
    quantity: Number(x.quantity || 1),
    unitCost: Number(x.unitCost || 0),
    vatRate: Number(x.vatRate ?? 0.2)
  })).filter((x: any) => x.description);
  const updated = await repo.replaceSupplierBillLines({
    billId,
    lines: cleaned
  });
  if (!updated) return NextResponse.json({
    ok: false,
    error: "update_failed"
  }, {
    status: 400
  });
  return NextResponse.json({
    ok: true,
    lines: updated
  });
});
