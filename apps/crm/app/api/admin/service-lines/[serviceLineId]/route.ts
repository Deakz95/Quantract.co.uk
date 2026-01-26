import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * GET /api/admin/service-lines/[serviceLineId]
 * Get a single service line.
 */
export const GET = withRequestLogging(async function GET(
  _req: Request,
  ctx: { params: Promise<{ serviceLineId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { serviceLineId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const serviceLine = await client.serviceLine.findFirst({
    where: { id: serviceLineId, companyId },
    include: {
      defaultLegalEntity: {
        select: { id: true, displayName: true },
      },
    },
  });

  if (!serviceLine) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, serviceLine });
});

/**
 * PATCH /api/admin/service-lines/[serviceLineId]
 * Update a service line.
 */
export const PATCH = withRequestLogging(async function PATCH(
  req: Request,
  ctx: { params: Promise<{ serviceLineId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { serviceLineId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const existing = await client.serviceLine.findFirst({
    where: { id: serviceLineId, companyId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  const data: Record<string, any> = { updatedAt: new Date() };

  if (typeof body.name === "string") {
    data.name = body.name.trim();
  }

  if (typeof body.slug === "string") {
    const slug = slugify(body.slug);
    if (slug && slug !== existing.slug) {
      // Check for duplicate
      const dup = await client.serviceLine.findFirst({
        where: { companyId, slug, id: { not: serviceLineId } },
      });
      if (dup) {
        return NextResponse.json({ ok: false, error: "duplicate_slug" }, { status: 400 });
      }
      data.slug = slug;
    }
  }

  if (typeof body.description === "string") {
    data.description = body.description.trim() || null;
  }

  if (typeof body.status === "string" && ["active", "inactive"].includes(body.status)) {
    data.status = body.status;
  }

  // Handle defaultLegalEntityId
  if (body.defaultLegalEntityId !== undefined) {
    if (body.defaultLegalEntityId === null) {
      data.defaultLegalEntityId = null;
    } else {
      const entity = await client.legalEntity.findFirst({
        where: { id: body.defaultLegalEntityId, companyId },
      });
      if (entity) {
        data.defaultLegalEntityId = entity.id;
      }
    }
  }

  // Handle isDefault
  if (typeof body.isDefault === "boolean" && body.isDefault !== existing.isDefault) {
    if (body.isDefault) {
      // Unset other defaults
      await client.serviceLine.updateMany({
        where: { companyId, isDefault: true, id: { not: serviceLineId } },
        data: { isDefault: false, updatedAt: new Date() },
      });
      data.isDefault = true;
      // Update company default
      await client.company.update({
        where: { id: companyId },
        data: { defaultServiceLineId: serviceLineId, updatedAt: new Date() },
      });
    } else {
      data.isDefault = false;
    }
  }

  const serviceLine = await client.serviceLine.update({
    where: { id: serviceLineId },
    data,
    include: {
      defaultLegalEntity: {
        select: { id: true, displayName: true },
      },
    },
  });

  return NextResponse.json({ ok: true, serviceLine });
});

/**
 * DELETE /api/admin/service-lines/[serviceLineId]
 * Delete a service line (only if no jobs reference it).
 */
export const DELETE = withRequestLogging(async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ serviceLineId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { serviceLineId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const serviceLine = await client.serviceLine.findFirst({
    where: { id: serviceLineId, companyId },
  });

  if (!serviceLine) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Check for references
  const jobCount = await client.job.count({ where: { serviceLineId } });

  if (jobCount > 0) {
    return NextResponse.json({
      ok: false,
      error: "service_line_in_use",
      message: `Cannot delete: ${jobCount} job(s) reference this service line.`,
    }, { status: 400 });
  }

  // Check if it's the default
  if (serviceLine.isDefault) {
    return NextResponse.json({
      ok: false,
      error: "cannot_delete_default",
      message: "Cannot delete the default service line. Set another service line as default first.",
    }, { status: 400 });
  }

  await client.serviceLine.delete({ where: { id: serviceLineId } });

  return NextResponse.json({ ok: true });
});
