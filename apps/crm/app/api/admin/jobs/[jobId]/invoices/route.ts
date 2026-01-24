import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const GET = withRequestLogging(async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  await requireRole("admin");
  const { jobId } = await getRouteParams(ctx);
  const invoices = await repo.listInvoicesForJob(jobId);
  return NextResponse.json({
    ok: true,
    invoices
  });
});
export const POST = withRequestLogging(async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  await requireRole("admin");
  const { jobId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => ({}))) as any;
  const type = String(body?.type || "stage").trim() as any;
  const stageName = body?.stageName ? String(body.stageName).trim() : undefined;
  const variationId = body?.variationId ? String(body.variationId).trim() : undefined;
  const subtotal = Number(body?.subtotal ?? 0);
  const vatRate = typeof body?.vatRate === "number" ? body.vatRate : undefined;
  if (!subtotal || subtotal <= 0) return NextResponse.json({
    ok: false,
    error: "invalid_subtotal"
  }, {
    status: 400
  });
  const invoice = await repo.createInvoiceForJob({
    jobId,
    type,
    stageName,
    variationId,
    subtotal,
    vatRate,
    status: "draft"
  });
  if (!invoice) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });
  return NextResponse.json({
    ok: true,
    invoice
  });
});
