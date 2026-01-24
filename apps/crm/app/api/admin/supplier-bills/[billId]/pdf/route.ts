import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { writeUploadBytes, readUploadBytes } from "@/lib/server/storage";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(_req: Request, ctx: { params: Promise<{ billId: string }> }) {
  await requireRole("admin");
  const { billId } = await getRouteParams(ctx);
  const bill = await repo.getSupplierBillById(billId);
  if (!bill || !bill.pdfKey) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });
  const bytes = readUploadBytes(bill.pdfKey);
  if (!bytes) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });
  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename=supplier-bill-${bill.id}.pdf`
    }
  });
});
export const POST = withRequestLogging(async function POST(req: Request, ctx: { params: Promise<{ billId: string }> }) {
  await requireRole("admin");
  const { billId } = await getRouteParams(ctx);
  const bill = await repo.getSupplierBillById(billId);
  if (!bill) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({
    ok: false,
    error: "bad_form"
  }, {
    status: 400
  });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({
    ok: false,
    error: "missing_file"
  }, {
    status: 400
  });
  const buf = Buffer.from(await file.arrayBuffer());
  const key = writeUploadBytes(buf, {
    ext: "pdf",
    prefix: "supplier_bills"
  });
  const updated = await repo.setSupplierBillPdf({
    billId,
    pdfKey: key
  });
  if (!updated) return NextResponse.json({
    ok: false,
    error: "update_failed"
  }, {
    status: 400
  });
  return NextResponse.json({
    ok: true,
    pdfKey: key
  });
});
