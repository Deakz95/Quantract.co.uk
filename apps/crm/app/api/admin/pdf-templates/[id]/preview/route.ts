import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { validateLayout, renderFromTemplate, type TemplateLayout } from "@/lib/server/pdfTemplateRenderer";
import { getBrandContextForCurrentCompany } from "@/lib/server/repo";

export const runtime = "nodejs";

/** Cert-type-specific sample data */
const CERT_TYPE_SAMPLE: Record<string, Record<string, unknown>> = {
  EICR: {
    certType: "EICR",
    overallAssessment: "Satisfactory",
    recommendations: "Recommend upgrading consumer unit to 18th edition standard",
    limitations: "Unable to access loft space wiring",
    observations: "C2: Lack of earthing to gas/water bonding",
    nextInspectionDate: "2031-01-15",
  },
  EIC: {
    certType: "EIC",
    extentOfWork: "Full rewire of domestic property",
    worksTested: "All circuits tested including ring final, lighting, and cooker circuits",
    declarationComments: "Installation complies with BS 7671:2018",
  },
  MWC: {
    certType: "MWC",
    extentOfWork: "Addition of 2 double sockets to kitchen ring final",
    declarationComments: "Minor works in compliance with BS 7671",
  },
};

/** Base sample data used for preview rendering */
const BASE_SAMPLE_DATA: Record<string, unknown> = {
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
  installationAddress: "123 High Street, London, SW1A 1AA",
  inspectorName: "John Engineer",
  inspectorEmail: "john@acme.com",
  notes: "Standard rewiring quote",
  reason: "Additional sockets requested",
  receiptId: "PAY-0001",
  amount: "\u00A31,440.00",
  provider: "STRIPE",
  subtotal: "\u00A31,200.00",
  vat: "\u00A3240.00",
  vatPercent: "20",
  total: "\u00A31,440.00",
  status: "SENT",
  footerLine1: "Acme Electrical Ltd \u2014 Registered in England No. 12345678",
  footerLine2: "VAT No. GB 987654321",
  contactDetails: "info@acme.com | 020 1234 5678",
  // Certificate-specific fields
  jobReference: "JOB-2026-042",
  jobDescription: "Periodic inspection and testing of domestic electrical installation",
  descriptionOfWork: "Full periodic inspection and testing",
  supplyType: "Single phase",
  earthingArrangement: "TN-C-S",
  distributionType: "Single consumer unit",
  maxDemand: "100A",
  overallAssessment: "Satisfactory",
  recommendations: "",
  extentOfWork: "",
  worksTested: "",
  declarationComments: "",
  limitations: "",
  observations: "",
  nextInspectionDate: "",
  outcome: "PASS",
  outcomeReason: "Installation meets requirements",
  engineerName: "John Engineer",
  engineerSignedAt: new Date().toLocaleDateString("en-GB"),
  customerName: "Jane Smith",
  customerSignedAt: new Date().toLocaleDateString("en-GB"),
  items: [
    { description: "Consumer unit upgrade", qty: 1, unitPrice: "\u00A3450.00", lineTotal: "\u00A3450.00" },
    { description: "Socket installation (double)", qty: 6, unitPrice: "\u00A385.00", lineTotal: "\u00A3510.00" },
    { description: "Testing and certification", qty: 1, unitPrice: "\u00A3240.00", lineTotal: "\u00A3240.00" },
  ],
};

/**
 * POST /api/admin/pdf-templates/[id]/preview
 * Render a preview PDF from the provided layout JSON.
 * Accepts { layout, certType?, certificateId? } in the body.
 * - certType: use cert-type-specific sample data
 * - certificateId: preview using real certificate data (must belong to same company)
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

  // Build preview data
  let previewData: Record<string, unknown> = { ...BASE_SAMPLE_DATA, companyName: brand?.name ?? "Quantract" };

  // Merge cert-type-specific sample data if requested
  if (body.certType && typeof body.certType === "string" && CERT_TYPE_SAMPLE[body.certType]) {
    previewData = { ...previewData, ...CERT_TYPE_SAMPLE[body.certType] };
  }

  // Optional: preview using a real certificate's data (with strict tenant scoping)
  if (body.certificateId && typeof body.certificateId === "string") {
    const cert = await client.certificate.findFirst({
      where: { id: body.certificateId, companyId },
      select: {
        id: true,
        type: true,
        status: true,
        certificateNumber: true,
        inspectorName: true,
        inspectorEmail: true,
        outcome: true,
        outcomeReason: true,
        data: true,
        issuedAt: true,
      },
    });
    if (!cert) {
      return NextResponse.json({ ok: false, error: "certificate_not_found" }, { status: 404 });
    }
    // Build data dict from the real certificate (safe because we verified companyId)
    const certData = (cert.data as Record<string, unknown>) ?? {};
    const overview = (certData.overview as Record<string, unknown>) ?? {};
    const installation = (certData.installation as Record<string, unknown>) ?? {};
    const inspection = (certData.inspection as Record<string, unknown>) ?? {};
    const assessment = (certData.assessment as Record<string, unknown>) ?? {};
    const declarations = (certData.declarations as Record<string, unknown>) ?? {};
    previewData = {
      ...previewData,
      id: cert.id,
      certType: cert.type,
      certificateNumber: cert.certificateNumber ?? "",
      status: cert.status,
      inspectorName: cert.inspectorName ?? "",
      inspectorEmail: cert.inspectorEmail ?? "",
      outcome: cert.outcome ?? "",
      outcomeReason: cert.outcomeReason ?? "",
      issuedAt: cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString("en-GB") : "",
      siteName: overview.siteName ?? "",
      installationAddress: overview.installationAddress ?? "",
      clientName: overview.clientName ?? "",
      clientEmail: overview.clientEmail ?? "",
      jobReference: overview.jobReference ?? "",
      jobDescription: overview.jobDescription ?? "",
      descriptionOfWork: installation.descriptionOfWork ?? "",
      supplyType: installation.supplyType ?? "",
      earthingArrangement: installation.earthingArrangement ?? "",
      distributionType: installation.distributionType ?? "",
      maxDemand: installation.maxDemand ?? "",
      limitations: inspection.limitations ?? "",
      observations: inspection.observations ?? "",
      nextInspectionDate: inspection.nextInspectionDate ?? "",
      overallAssessment: assessment.overallAssessment ?? "",
      recommendations: assessment.recommendations ?? "",
      extentOfWork: declarations.extentOfWork ?? "",
      worksTested: declarations.worksTested ?? "",
      declarationComments: declarations.comments ?? "",
    };
  }

  const pdfBuffer = await renderFromTemplate(layout, previewData, brand);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="template-preview.pdf"`,
    },
  });
});
