import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * GET /api/admin/service-lines
 * List all service lines for the current company.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const serviceLines = await client.serviceLine.findMany({
    where: { companyId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      DefaultLegalEntity: {
        select: { id: true, displayName: true },
      },
    },
  });

  return NextResponse.json({ ok: true, serviceLines });
});

/**
 * POST /api/admin/service-lines
 * Create a new service line.
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "missing_name" }, { status: 400 });
  }

  const slug = body.slug ? slugify(String(body.slug)) : slugify(name);

  // Check for duplicate slug
  const existing = await client.serviceLine.findFirst({
    where: { companyId, slug },
  });
  if (existing) {
    return NextResponse.json({ ok: false, error: "duplicate_slug" }, { status: 400 });
  }

  const isDefault = Boolean(body.isDefault);

  // If setting as default, unset other defaults
  if (isDefault) {
    await client.serviceLine.updateMany({
      where: { companyId, isDefault: true },
      data: { isDefault: false, updatedAt: new Date() },
    });
  }

  // Validate defaultLegalEntityId if provided
  let defaultLegalEntityId: string | null = null;
  if (body.defaultLegalEntityId) {
    const entity = await client.legalEntity.findFirst({
      where: { id: body.defaultLegalEntityId, companyId },
    });
    if (entity) {
      defaultLegalEntityId = entity.id;
    }
  }

  const serviceLine = await client.serviceLine.create({
    data: {
      id: randomUUID(),
      companyId,
      name,
      slug,
      description: body.description ? String(body.description).trim() : null,
      defaultLegalEntityId,
      isDefault,
      status: "active",
      updatedAt: new Date(),
    },
    include: {
      DefaultLegalEntity: {
        select: { id: true, displayName: true },
      },
    },
  });

  // If this is marked default, update company
  if (isDefault) {
    await client.company.update({
      where: { id: companyId },
      data: { defaultServiceLineId: serviceLine.id, updatedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true, serviceLine });
});
