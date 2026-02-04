import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logCriticalAction, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * POST /api/admin/impersonate/stop
 *
 * Stops the current impersonation session.
 * - Finds the active impersonation_logs record for this admin
 * - Sets endedAt on the DB record
 * - Clears User.currentImpersonationId
 * - Logs critical action
 */
export const POST = withRequestLogging(async function POST() {
  try {
    const ctx = await requireCompanyContext();
    const role = getEffectiveRole(ctx);

    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();

    // Find active impersonation by this admin
    const active = await prisma.impersonation_logs.findFirst({
      where: { adminUserId: ctx.userId, endedAt: null, companyId: ctx.companyId },
      include: { targetUser: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { startedAt: "desc" },
    });

    if (!active) {
      return NextResponse.json({ ok: false, error: "No active impersonation session" }, { status: 404 });
    }

    // End the impersonation
    await prisma.impersonation_logs.update({
      where: { id: active.id },
      data: { endedAt: new Date() },
    });

    // Clear User.currentImpersonationId
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { currentImpersonationId: null },
    });

    // Critical action log
    logCriticalAction({
      name: "impersonation.ended",
      companyId: ctx.companyId,
      userId: ctx.userId,
      actorId: ctx.userId,
      metadata: {
        impersonationId: active.id,
        targetUserId: active.targetUserId,
        targetEmail: active.targetUser?.email,
        durationMs: Date.now() - new Date(active.startedAt).getTime(),
      },
    });

    return NextResponse.json({ ok: true, ended: true });
  } catch (error) {
    logError(error, { route: "/api/admin/impersonate/stop", action: "stop" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "stop_failed" }, { status: 500 });
  }
});
