import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getDefaultLayout } from "@/lib/server/pdfTemplateRenderer";
import crypto from "node:crypto";

export const runtime = "nodejs";

const CERT_DOC_TYPE = "certificate";
const DEFAULT_TEMPLATE_NAME = "Default Certificate";

/**
 * POST /api/admin/pdf-templates/backfill
 *
 * Idempotent endpoint: ensures the current company has a default certificate
 * template. If one already exists, returns it without modification.
 * If none exists, creates one using the built-in default layout.
 *
 * Auth: admin only.
 */
export const POST = withRequestLogging(async function POST() {
  try {
    await requireRoles(["admin"]);
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  // Check if a default certificate template already exists
  const existing = await prisma.pdfTemplate.findFirst({
    where: { companyId, docType: CERT_DOC_TYPE, isDefault: true },
    include: { versions: { select: { id: true, version: true }, orderBy: { version: "desc" }, take: 1 } },
  });

  if (existing) {
    return NextResponse.json({
      ok: true,
      action: "already_exists",
      templateId: existing.id,
      latestVersionId: existing.versions[0]?.id ?? null,
    });
  }

  // Create default template with initial version
  const defaultLayout = getDefaultLayout(CERT_DOC_TYPE);
  const templateId = crypto.randomUUID();
  const versionId = crypto.randomUUID();

  const template = await prisma.pdfTemplate.create({
    data: {
      id: templateId,
      companyId,
      docType: CERT_DOC_TYPE,
      name: DEFAULT_TEMPLATE_NAME,
      isDefault: true,
      versions: {
        create: {
          id: versionId,
          version: 1,
          layout: defaultLayout as any,
        },
      },
    },
    include: { versions: { select: { id: true, version: true } } },
  });

  // Audit event
  try {
    await prisma.auditEvent.create({
      data: {
        id: crypto.randomUUID(),
        companyId,
        entityType: "pdf_template",
        entityId: templateId,
        action: "pdf_template.backfill_created",
        actorRole: "admin",
        meta: { docType: CERT_DOC_TYPE, name: DEFAULT_TEMPLATE_NAME, versionId },
      },
    });
  } catch {
    // Non-fatal — template was created successfully
  }

  return NextResponse.json({
    ok: true,
    action: "created",
    templateId: template.id,
    latestVersionId: versionId,
  }, { status: 201 });
});
