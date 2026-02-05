import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import {
  getActiveTemplateLayout,
  buildCertificateDataDict,
  renderCertificatePdf,
} from "@/lib/server/pdf";
import { getBrandContextForCurrentCompany } from "@/lib/server/repo";
import { renderFromTemplate, type TemplateImageAttachments } from "@/lib/server/pdfTemplateRenderer";
import { getRouteParams } from "@/lib/server/routeParams";
import { readUploadBytes } from "@/lib/server/storage";

export const runtime = "nodejs";

/**
 * POST /api/admin/certificates/[certificateId]/preview-pdf
 *
 * Renders a preview PDF for a certificate using the company's active template.
 * Falls back to hardcoded rendering if no template exists.
 *
 * Auth: admin/office only, company-scoped.
 * Response: application/pdf with Cache-Control: no-store.
 */
export const POST = withRequestLogging(async function POST(
  _req: Request,
  ctx: { params: Promise<{ certificateId: string }> },
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

  const { certificateId } = await getRouteParams(ctx);
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  // Fetch certificate with relations, scoped to company
  const cert = await prisma.certificate.findFirst({
    where: { id: certificateId, companyId },
    include: {
      client: true,
      site: true,
      certificateTestResults: { orderBy: { createdAt: "asc" } },
      attachments: {
        where: { companyId },
        orderBy: [{ category: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!cert) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  let brand;
  try {
    brand = await getBrandContextForCurrentCompany();
  } catch {
    brand = undefined;
  }

  // Try template-based rendering
  const templateResult = await getActiveTemplateLayout(companyId, "certificate");
  let pdfBuffer: Buffer;

  if (templateResult) {
    const dataDict = buildCertificateDataDict(
      {
        id: cert.id,
        certificateNumber: cert.certificateNumber,
        type: cert.type,
        status: cert.status,
        issuedAtISO: cert.issuedAt?.toISOString() ?? null,
        inspectorName: cert.inspectorName,
        inspectorEmail: cert.inspectorEmail,
        outcome: cert.outcome,
        outcomeReason: cert.outcomeReason,
        data: cert.data as Record<string, unknown>,
      },
      brand,
    );
    try {
      // Build image attachments from company-scoped certificate attachments
      const imageAttachments = buildPreviewAttachments(cert.attachments ?? []);
      pdfBuffer = await renderFromTemplate(templateResult.layout, dataDict, brand, imageAttachments);
    } catch {
      // Fallback to hardcoded
      pdfBuffer = await renderCertificatePdf({
        certificate: cert as any,
        client: cert.client,
        site: cert.site,
        testResults: cert.certificateTestResults,
        brand,
      });
    }
  } else {
    pdfBuffer = await renderCertificatePdf({
      certificate: cert as any,
      client: cert.client,
      site: cert.site,
      testResults: cert.certificateTestResults,
      brand,
    });
  }

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-preview-${certificateId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
});

// ── Attachment image loader ──

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2MB per image

function buildPreviewAttachments(
  attachments: Array<{ fileKey: string; mimeType: string; category: string | null }>,
): TemplateImageAttachments {
  const result: TemplateImageAttachments = { photos: [] };
  for (const att of attachments) {
    if (!att.mimeType.startsWith("image/")) continue;
    const bytes = readUploadBytes(att.fileKey);
    if (!bytes || bytes.length > MAX_ATTACHMENT_BYTES) continue;
    const u8 = new Uint8Array(bytes);
    if (att.category === "signature_engineer" && !result.signatureEngineer) {
      result.signatureEngineer = u8;
    } else if (att.category === "signature_customer" && !result.signatureCustomer) {
      result.signatureCustomer = u8;
    } else if (att.category === "photo" || !att.category) {
      if (result.photos!.length < 5) {
        result.photos!.push(u8);
      }
    }
  }
  return result;
}
