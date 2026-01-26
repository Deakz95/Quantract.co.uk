import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

/**
 * GET /api/admin/lead-capture/keys/[keyId]
 * Get a single integration key (without the secret).
 */
export const GET = withRequestLogging(async function GET(
  _req: Request,
  ctx: { params: Promise<{ keyId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { keyId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const key = await client.inboundIntegrationKey.findFirst({
    where: { id: keyId, companyId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      usageCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!key) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, key });
});

/**
 * PATCH /api/admin/lead-capture/keys/[keyId]
 * Update an integration key (can toggle active, change name, permissions, expiration).
 */
export const PATCH = withRequestLogging(async function PATCH(
  req: Request,
  ctx: { params: Promise<{ keyId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { keyId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const existing = await client.inboundIntegrationKey.findFirst({
    where: { id: keyId, companyId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "invalid_name" }, { status: 400 });
    }
    // Check for duplicate
    const dup = await client.inboundIntegrationKey.findFirst({
      where: { companyId, name, id: { not: keyId } },
    });
    if (dup) {
      return NextResponse.json({ ok: false, error: "duplicate_name" }, { status: 400 });
    }
    data.name = name;
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  if (typeof body.permissions === "string") {
    data.permissions = body.permissions;
  }

  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null) {
      data.expiresAt = null;
    } else {
      const expiresAt = new Date(body.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        return NextResponse.json({ ok: false, error: "invalid_expiration_date" }, { status: 400 });
      }
      data.expiresAt = expiresAt;
    }
  }

  const key = await client.inboundIntegrationKey.update({
    where: { id: keyId },
    data,
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      usageCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, key });
});

/**
 * DELETE /api/admin/lead-capture/keys/[keyId]
 * Delete an integration key (revokes it permanently).
 */
export const DELETE = withRequestLogging(async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ keyId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { keyId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const key = await client.inboundIntegrationKey.findFirst({
    where: { id: keyId, companyId },
  });

  if (!key) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  await client.inboundIntegrationKey.delete({ where: { id: keyId } });

  return NextResponse.json({ ok: true });
});
