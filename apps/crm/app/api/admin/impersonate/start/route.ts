import { NextRequest, NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logCriticalAction, logError } from "@/lib/server/observability";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/admin/impersonate/start
 *
 * Starts an impersonation session.
 * - Validates admin role
 * - Creates a DB-backed impersonation_logs record (source of truth)
 * - Sets User.currentImpersonationId for fast lookup
 * - Logs critical action
 *
 * The impersonation is DB-backed, NOT cookie-backed, per security requirements.
 * The read-only guard checks the DB record, not a cookie value.
 */
export const POST = withRequestLogging(async function POST(req: NextRequest) {
  try {
    const ctx = await requireCompanyContext();
    const role = getEffectiveRole(ctx);

    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "Only admins can impersonate users" }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId, reason } = body;

    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json({ ok: false, error: "targetUserId is required" }, { status: 400 });
    }

    // Cannot impersonate yourself
    if (targetUserId === ctx.userId) {
      return NextResponse.json({ ok: false, error: "Cannot impersonate yourself" }, { status: 400 });
    }

    const prisma = getPrisma();

    // Check target user exists and belongs to the same company
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, companyId: ctx.companyId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ ok: false, error: "Target user not found" }, { status: 404 });
    }

    // End any existing active impersonation by this admin
    await prisma.impersonation_logs.updateMany({
      where: { adminUserId: ctx.userId, endedAt: null, companyId: ctx.companyId },
      data: { endedAt: new Date() },
    });

    // Get request metadata from the request object
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    // Create impersonation log record (DB-backed source of truth)
    const impersonationId = randomUUID();
    const impersonationLog = await prisma.impersonation_logs.create({
      data: {
        id: impersonationId,
        adminUserId: ctx.userId,
        targetUserId,
        companyId: ctx.companyId,
        reason: reason || null,
        ipAddress: ipAddress?.slice(0, 45) || null,
        userAgent: userAgent?.slice(0, 500) || null,
        updatedAt: new Date(),
      },
    });

    // Set User.currentImpersonationId for fast lookup in read-only guard
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { currentImpersonationId: impersonationId },
    });

    // Critical action log
    logCriticalAction({
      name: "impersonation.started",
      companyId: ctx.companyId,
      userId: ctx.userId,
      actorId: ctx.userId,
      metadata: {
        impersonationId,
        targetUserId,
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
        reason: reason || null,
        ipAddress,
      },
    });

    return NextResponse.json({
      ok: true,
      impersonationId,
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error) {
    logError(error, { route: "/api/admin/impersonate/start", action: "start" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "impersonation_failed" }, { status: 500 });
  }
});
