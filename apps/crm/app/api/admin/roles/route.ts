export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logCriticalAction, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

const VALID_ROLES = ["admin", "office", "finance", "engineer", "client"] as const;

export const GET = withRequestLogging(async function GET(_req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;

    // Fetch all company users with their linked User record for name/email
    const companyUsers = await prisma.companyUser.findMany({
      where: { companyId: cid },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Fetch all explicit permission overrides for users in this company
    const permissionRows = await prisma.userPermission.findMany({
      where: { companyId: cid, enabled: true },
    });

    // Group permissions by userId
    const permissions: Record<string, string[]> = {};
    for (const row of permissionRows) {
      if (!permissions[row.userId]) {
        permissions[row.userId] = [];
      }
      permissions[row.userId].push(row.key);
    }

    const users = companyUsers.map((cu: any) => ({
      id: cu.userId || cu.id,
      companyUserId: cu.id,
      name: cu.user?.name || null,
      email: cu.user?.email || cu.email,
      role: cu.role,
      isActive: cu.isActive,
    }));

    return NextResponse.json({ ok: true, users, permissions });
  } catch (error) {
    logError(error, { route: "/api/admin/roles", action: "list" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json(
        { ok: false, error: err.message || "forbidden" },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Failed to fetch roles" },
      { status: 500 },
    );
  }
});

export const PUT = withRequestLogging(async function PUT(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;

    const body = await req.json();
    const { userId, role } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { ok: false, error: "userId is required" },
        { status: 400 },
      );
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { ok: false, error: `role must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 },
      );
    }

    // Find the CompanyUser record for this user in this company
    const companyUser = await prisma.companyUser.findFirst({
      where: { companyId: cid, userId },
    });

    if (!companyUser) {
      return NextResponse.json(
        { ok: false, error: "User not found in this company" },
        { status: 404 },
      );
    }

    // Update the role
    await prisma.companyUser.update({
      where: { id: companyUser.id },
      data: { role },
    });

    // Also update User.role to stay in sync
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    logCriticalAction({
      name: "user.role.changed",
      companyId: cid,
      actorId: authCtx.userId,
      metadata: { targetUserId: userId, newRole: role, previousRole: companyUser.role },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError(error, { route: "/api/admin/roles", action: "update_role" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json(
        { ok: false, error: err.message || "forbidden" },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Failed to update role" },
      { status: 500 },
    );
  }
});
