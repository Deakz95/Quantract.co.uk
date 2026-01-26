import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

/**
 * GET /api/admin/lead-capture/domains/[domainId]
 * Get a single allowed domain.
 */
export const GET = withRequestLogging(async function GET(
  _req: Request,
  ctx: { params: Promise<{ domainId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { domainId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const domain = await client.allowedDomain.findFirst({
    where: { id: domainId, companyId },
  });

  if (!domain) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, domain });
});

/**
 * PATCH /api/admin/lead-capture/domains/[domainId]
 * Update an allowed domain.
 */
export const PATCH = withRequestLogging(async function PATCH(
  req: Request,
  ctx: { params: Promise<{ domainId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { domainId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const existing = await client.allowedDomain.findFirst({
    where: { id: domainId, companyId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  if (typeof body.domain === "string") {
    let domain = body.domain.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ ok: false, error: "invalid_domain_format" }, { status: 400 });
    }

    // Check for duplicate
    const dup = await client.allowedDomain.findFirst({
      where: { companyId, domain, id: { not: domainId } },
    });
    if (dup) {
      return NextResponse.json({ ok: false, error: "duplicate_domain" }, { status: 400 });
    }

    data.domain = domain;
  }

  const updatedDomain = await client.allowedDomain.update({
    where: { id: domainId },
    data,
  });

  return NextResponse.json({ ok: true, domain: updatedDomain });
});

/**
 * DELETE /api/admin/lead-capture/domains/[domainId]
 * Delete an allowed domain.
 */
export const DELETE = withRequestLogging(async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ domainId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { domainId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const domain = await client.allowedDomain.findFirst({
    where: { id: domainId, companyId },
  });

  if (!domain) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  await client.allowedDomain.delete({ where: { id: domainId } });

  return NextResponse.json({ ok: true });
});
