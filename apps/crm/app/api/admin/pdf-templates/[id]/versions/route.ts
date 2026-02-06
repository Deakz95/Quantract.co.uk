import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { validateLayout } from "@/lib/server/pdfTemplateRenderer";
import { validateTemplateForCertType } from "@quantract/shared/pdfTemplateConstants";
import crypto from "node:crypto";

export const runtime = "nodejs";

/**
 * POST /api/admin/pdf-templates/[id]/versions
 * Create a new immutable version of the template with the given layout.
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
  const layout = body.layout;

  if (!layout) {
    return NextResponse.json({ ok: false, error: "layout_required" }, { status: 400 });
  }

  const validation = validateLayout(layout);
  if (!validation.valid) {
    return NextResponse.json({ ok: false, error: "invalid_layout", details: validation.error }, { status: 400 });
  }

  // Validate required bindings for certificate templates
  let certTypeWarnings: string[] | undefined;
  if (template.docType === "certificate" && body.certType) {
    const certValidation = validateTemplateForCertType(layout, body.certType);
    if (!certValidation.valid) {
      // Return as warnings, not blocking — allows saving with missing bindings
      certTypeWarnings = certValidation.missing;
    }
  }

  const nextVersion = (template.versions[0]?.version ?? 0) + 1;

  const version = await client.pdfTemplateVersion.create({
    data: {
      id: crypto.randomUUID(),
      templateId: id,
      version: nextVersion,
      layout: layout as any,
    },
  });

  // Audit event for template version creation
  try {
    await client.auditEvent.create({
      data: {
        id: crypto.randomUUID(),
        companyId,
        entityType: "pdf_template",
        entityId: id,
        action: "pdf_template.version_created",
        actorRole: "admin",
        meta: {
          version: nextVersion,
          versionId: version.id,
          docType: template.docType,
        },
      },
    });
  } catch {
    // Non-fatal — audit logging should not block template saves
  }

  return NextResponse.json({
    ok: true,
    version,
    ...(certTypeWarnings ? { warnings: { missingBindings: certTypeWarnings } } : {}),
  }, { status: 201 });
});
