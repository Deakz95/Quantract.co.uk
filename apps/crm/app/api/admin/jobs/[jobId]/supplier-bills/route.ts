import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  await requireRole("admin");
  const { jobId } = await getRouteParams(ctx);
  const bills = await repo.listSupplierBills(jobId);
  return NextResponse.json({
    ok: true,
    bills
  });
});
export const POST = withRequestLogging(async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  await requireRole("admin");
  const { jobId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => ({}))) as any;
  const supplier = String(body.supplier || "").trim();
  const subtotal = Number(body.subtotal || 0);
  const vat = Number(body.vat || 0);
  const total = Number(body.total || subtotal + vat);
  if (!supplier) return NextResponse.json({
    ok: false,
    error: "missing_supplier"
  }, {
    status: 400
  });
  const created = await repo.createSupplierBill({
    jobId,
    supplier,
    reference: body.reference,
    billDateISO: body.billDateISO,
    subtotal,
    vat,
    total
  });
  if (!created) return NextResponse.json({
    ok: false,
    error: "create_failed"
  }, {
    status: 400
  });
  return NextResponse.json({
    ok: true,
    id: created.id
  });
});
