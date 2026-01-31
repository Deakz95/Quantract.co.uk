import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const GET = withRequestLogging(async function GET(
  _req: Request,
  ctx: { params: Promise<{ invoiceId: string }> },
) {
  await requireRole("admin");
  const companyId = await requireCompanyId();
  const { invoiceId } = await getRouteParams(ctx);

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });

  const links = await prisma.invoiceCertificate.findMany({
    where: { invoiceId, companyId },
    include: {
      certificate: {
        select: {
          id: true,
          type: true,
          certificateNumber: true,
          status: true,
          issuedAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    ok: true,
    certificates: links.map((l: any) => ({
      id: l.certificate.id,
      type: l.certificate.type,
      certificateNumber: l.certificate.certificateNumber,
      status: l.certificate.status,
      issuedAt: l.certificate.issuedAt?.toISOString() ?? null,
      linkedAt: l.createdAt.toISOString(),
    })),
  });
});

export const POST = withRequestLogging(async function POST(
  req: Request,
  ctx: { params: Promise<{ invoiceId: string }> },
) {
  await requireRole("admin");
  const companyId = await requireCompanyId();
  const { invoiceId } = await getRouteParams(ctx);

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as any;
  const certificateId = typeof body.certificateId === "string" ? body.certificateId.trim() : "";
  if (!certificateId) {
    return NextResponse.json({ ok: false, error: "missing_certificate_id" }, { status: 400 });
  }

  // Validate invoice belongs to company
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    select: { id: true, jobId: true },
  });
  if (!invoice) {
    return NextResponse.json({ ok: false, error: "invoice_not_found" }, { status: 404 });
  }

  // Validate certificate belongs to same company and is issued
  const cert = await prisma.certificate.findFirst({
    where: { id: certificateId, companyId },
    select: { id: true, status: true, jobId: true },
  });
  if (!cert) {
    return NextResponse.json({ ok: false, error: "certificate_not_found" }, { status: 404 });
  }
  if (cert.status !== "issued") {
    return NextResponse.json({ ok: false, error: "certificate_not_issued" }, { status: 400 });
  }

  // Upsert for idempotency
  await prisma.invoiceCertificate.upsert({
    where: { invoiceId_certificateId: { invoiceId, certificateId } },
    create: { companyId, invoiceId, certificateId },
    update: {},
  });

  return NextResponse.json({ ok: true });
});
