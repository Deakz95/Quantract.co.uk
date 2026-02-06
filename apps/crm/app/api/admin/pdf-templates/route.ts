import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { computeEntitlements, hasEntitlement } from "@/lib/entitlements";
import { validateLayout, getDefaultLayout } from "@/lib/server/pdfTemplateRenderer";
import crypto from "node:crypto";

export const runtime = "nodejs";

const VALID_DOC_TYPES = ["invoice", "quote", "certificate", "variation", "receipt"];

/**
 * GET /api/admin/pdf-templates
 * List all PDF templates for the current company.
 */
export const GET = withRequestLogging(async function GET(req: Request) {
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

  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  // Optional docType filter (e.g. ?docType=certificate)
  const url = new URL(req.url);
  const docTypeFilter = url.searchParams.get("docType");
  const where: Record<string, unknown> = { companyId };
  if (docTypeFilter && VALID_DOC_TYPES.includes(docTypeFilter)) {
    where.docType = docTypeFilter;
  }

  const templates = await client.pdfTemplate.findMany({
    where,
    include: { versions: { select: { id: true, version: true, createdAt: true }, orderBy: { version: "desc" } } },
    orderBy: [{ docType: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ ok: true, templates });
});

/**
 * POST /api/admin/pdf-templates
 * Create a new PDF template with an initial version using the default layout.
 */
export const POST = withRequestLogging(async function POST(req: Request) {
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

  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  // Check entitlement
  const company = await client.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  if (!company) return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 404 });
  const ent = computeEntitlements(company.plan);
  if (!hasEntitlement(ent, "feature_pdf_templates")) {
    return NextResponse.json({ ok: false, error: "upgrade_required", feature: "feature_pdf_templates", requiredPlan: "pro" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as any;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const docType = typeof body.docType === "string" ? body.docType.trim() : "";

  if (!name || name.length > 100) {
    return NextResponse.json({ ok: false, error: "invalid_name" }, { status: 400 });
  }
  if (!VALID_DOC_TYPES.includes(docType)) {
    return NextResponse.json({ ok: false, error: "invalid_doc_type" }, { status: 400 });
  }

  // Check for duplicate name
  const existing = await client.pdfTemplate.findUnique({ where: { companyId_docType_name: { companyId, docType, name } } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "duplicate_name" }, { status: 409 });
  }

  const defaultLayout = getDefaultLayout(docType);

  const templateId = crypto.randomUUID();
  const template = await client.pdfTemplate.create({
    data: {
      id: templateId,
      companyId,
      docType,
      name,
      isDefault: false,
      versions: {
        create: {
          id: crypto.randomUUID(),
          version: 1,
          layout: defaultLayout as any,
        },
      },
    },
    include: { versions: true },
  });

  // Audit event for template creation
  try {
    await client.auditEvent.create({
      data: {
        id: crypto.randomUUID(),
        companyId,
        entityType: "pdf_template",
        entityId: templateId,
        action: "pdf_template.created",
        actorRole: "admin",
        meta: { docType, name },
      },
    });
  } catch {
    // Non-fatal — audit logging should not block template creation
  }

  return NextResponse.json({ ok: true, template }, { status: 201 });
});
