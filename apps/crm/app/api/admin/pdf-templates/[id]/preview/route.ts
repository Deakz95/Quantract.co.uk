import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { validateLayout, renderFromTemplate, type TemplateLayout } from "@/lib/server/pdfTemplateRenderer";
import { getBrandContextForCurrentCompany } from "@/lib/server/repo";

export const runtime = "nodejs";

/** Sample data used for preview rendering */
const SAMPLE_DATA: Record<string, unknown> = {
  companyName: "Acme Electrical Ltd",
  id: "PREVIEW-001",
  invoiceNumber: "INV-0042",
  certificateNumber: "CERT-0017",
  certType: "EICR",
  createdAt: new Date().toLocaleDateString("en-GB"),
  paidAt: new Date().toLocaleDateString("en-GB"),
  acceptedAt: new Date().toLocaleDateString("en-GB"),
  issuedAt: new Date().toLocaleDateString("en-GB"),
  clientName: "Jane Smith",
  clientEmail: "jane@example.com",
  siteAddress: "123 High Street, London, SW1A 1AA",
  siteName: "Smith Residence",
  inspectorName: "John Engineer",
  inspectorEmail: "john@acme.com",
  notes: "Standard rewiring quote",
  reason: "Additional sockets requested",
  receiptId: "PAY-0001",
  amount: "£1,440.00",
  provider: "STRIPE",
  subtotal: "£1,200.00",
  vat: "£240.00",
  vatPercent: "20",
  total: "£1,440.00",
  status: "SENT",
  footerLine1: "Acme Electrical Ltd — Registered in England No. 12345678",
  footerLine2: "VAT No. GB 987654321",
  contactDetails: "info@acme.com | 020 1234 5678",
  items: [
    { description: "Consumer unit upgrade", qty: 1, unitPrice: "£450.00", lineTotal: "£450.00" },
    { description: "Socket installation (double)", qty: 6, unitPrice: "£85.00", lineTotal: "£510.00" },
    { description: "Testing and certification", qty: 1, unitPrice: "£240.00", lineTotal: "£240.00" },
  ],
};

/**
 * POST /api/admin/pdf-templates/[id]/preview
 * Render a preview PDF from the provided layout JSON.
 * Accepts { layout } in the body, or renders the latest saved version if no layout provided.
 */
export const POST = withRequestLogging(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoles(["admin", "office"]);
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const template = await client.pdfTemplate.findFirst({
    where: { id, companyId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });

  if (!template) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as any;

  let layout: TemplateLayout;
  if (body.layout) {
    const validation = validateLayout(body.layout);
    if (!validation.valid) {
      return NextResponse.json({ ok: false, error: "invalid_layout", details: validation.error }, { status: 400 });
    }
    layout = body.layout;
  } else {
    // Use latest version
    const latestVersion = template.versions[0];
    if (!latestVersion) {
      return NextResponse.json({ ok: false, error: "no_versions" }, { status: 400 });
    }
    layout = latestVersion.layout as unknown as TemplateLayout;
  }

  let brand;
  try {
    brand = await getBrandContextForCurrentCompany();
  } catch {
    brand = null;
  }

  // Use company name from brand
  const previewData = { ...SAMPLE_DATA, companyName: brand?.name ?? "Quantract" };

  const pdfBuffer = await renderFromTemplate(layout, previewData, brand);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="template-preview.pdf"`,
    },
  });
});
