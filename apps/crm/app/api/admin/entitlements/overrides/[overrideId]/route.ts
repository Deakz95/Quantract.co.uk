import { NextRequest, NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logCriticalAction, logError } from "@/lib/server/observability";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * DELETE /api/admin/entitlements/overrides/[overrideId]
 * Soft-revokes an entitlement override by setting revokedAt + revokedBy.
 */
export const DELETE = withRequestLogging(async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ overrideId: string }> }
) {
  try {
    const ctx = await requireCompanyContext();
    const role = getEffectiveRole(ctx);
    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { overrideId } = await params;
    if (!overrideId) {
      return NextResponse.json({ ok: false, error: "overrideId is required" }, { status: 400 });
    }

    const prisma = getPrisma();

    // Verify the override exists and belongs to this company
    const existing = await prisma.entitlementOverride.findFirst({
      where: { id: overrideId, companyId: ctx.companyId },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    if (existing.revokedAt) {
      return NextResponse.json({ ok: false, error: "already_revoked" }, { status: 409 });
    }

    // Soft-revoke
    const updated = await prisma.entitlementOverride.update({
      where: { id: overrideId },
      data: {
        revokedAt: new Date(),
        revokedBy: ctx.userId,
      },
    });

    // Audit: write AuditEvent
    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        companyId: ctx.companyId,
        entityType: "entitlement_override",
        entityId: overrideId,
        action: "revoked",
        actorRole: role,
        actor: ctx.userId,
        meta: { key: existing.key, value: existing.value, originalReason: existing.reason },
        createdAt: new Date(),
      },
    });

    // Critical action log
    logCriticalAction({
      name: "entitlement.override.revoked",
      companyId: ctx.companyId,
      userId: ctx.userId,
      actorId: ctx.userId,
      metadata: { overrideId, key: existing.key, value: existing.value },
    });

    return NextResponse.json({ ok: true, override: updated });
  } catch (error) {
    logError(error, { route: "/api/admin/entitlements/overrides/[overrideId]", action: "revoke" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "revoke_failed" }, { status: 500 });
  }
});
