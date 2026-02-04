import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/admin/pdf-templates/[id]
 * Get a single template with all its versions.
 */
export const GET = withRequestLogging(async function GET(
  _req: Request,
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
    include: { versions: { orderBy: { version: "desc" } } },
  });

  if (!template) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, template });
});

/**
 * PATCH /api/admin/pdf-templates/[id]
 * Update template metadata (name, isDefault).
 */
export const PATCH = withRequestLogging(async function PATCH(
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

  const template = await client.pdfTemplate.findFirst({ where: { id, companyId } });
  if (!template) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as any;
  const data: any = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name || name.length > 100) {
      return NextResponse.json({ ok: false, error: "invalid_name" }, { status: 400 });
    }
    data.name = name;
  }

  if (typeof body.isDefault === "boolean") {
    if (body.isDefault) {
      // Unset any existing default for this (companyId, docType) first
      await client.pdfTemplate.updateMany({
        where: { companyId, docType: template.docType, isDefault: true },
        data: { isDefault: false },
      });
    }
    data.isDefault = body.isDefault;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "no_fields" }, { status: 400 });
  }

  const updated = await client.pdfTemplate.update({ where: { id }, data });
  return NextResponse.json({ ok: true, template: updated });
});

/**
 * DELETE /api/admin/pdf-templates/[id]
 * Delete a template and all its versions (cascade).
 */
export const DELETE = withRequestLogging(async function DELETE(
  _req: Request,
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

  const template = await client.pdfTemplate.findFirst({ where: { id, companyId } });
  if (!template) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  await client.pdfTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
