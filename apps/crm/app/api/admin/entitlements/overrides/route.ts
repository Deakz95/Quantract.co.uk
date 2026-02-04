import { NextRequest, NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logCriticalAction, logError } from "@/lib/server/observability";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * GET /api/admin/entitlements/overrides
 * Lists active (non-revoked, non-expired) entitlement overrides for the company.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const ctx = await requireCompanyContext();
    const role = getEffectiveRole(ctx);
    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const overrides = await prisma.entitlementOverride.findMany({
      where: {
        companyId: ctx.companyId,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { grantedAt: "desc" },
    });

    return NextResponse.json({ ok: true, overrides });
  } catch (error) {
    logError(error, { route: "/api/admin/entitlements/overrides", action: "list" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/**
 * POST /api/admin/entitlements/overrides
 * Creates a new entitlement override. Requires admin role and a reason.
 */
export const POST = withRequestLogging(async function POST(req: NextRequest) {
  try {
    const ctx = await requireCompanyContext();
    const role = getEffectiveRole(ctx);
    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { key, value, reason, expiresAt } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ ok: false, error: "key is required" }, { status: 400 });
    }
    if (value === undefined || value === null) {
      return NextResponse.json({ ok: false, error: "value is required" }, { status: 400 });
    }
    if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
      return NextResponse.json({ ok: false, error: "reason is required (min 3 chars)" }, { status: 400 });
    }

    const prisma = getPrisma();
    const id = randomUUID();

    const override = await prisma.entitlementOverride.create({
      data: {
        id,
        companyId: ctx.companyId,
        key: key.trim(),
        value: String(value),
        reason: reason.trim(),
        grantedBy: ctx.userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Audit: write AuditEvent
    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        companyId: ctx.companyId,
        entityType: "entitlement_override",
        entityId: id,
        action: "created",
        actorRole: role,
        actor: ctx.userId,
        meta: { key, value: String(value), reason: reason.trim(), expiresAt: expiresAt || null },
        createdAt: new Date(),
      },
    });

    // Critical action log
    logCriticalAction({
      name: "entitlement.override.created",
      companyId: ctx.companyId,
      userId: ctx.userId,
      actorId: ctx.userId,
      metadata: { overrideId: id, key, value: String(value), reason: reason.trim() },
    });

    return NextResponse.json({ ok: true, override }, { status: 201 });
  } catch (error) {
    logError(error, { route: "/api/admin/entitlements/overrides", action: "create" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
