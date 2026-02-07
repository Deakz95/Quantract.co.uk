import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logCriticalAction, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

const PRIMARY_ROLES = ["admin", "office", "engineer", "client"] as const;
type PrimaryRole = (typeof PRIMARY_ROLES)[number];

/**
 * Resolve the single stored role from a set of checked primary roles.
 * Priority: admin > office > engineer > client.
 */
function resolvePrimaryRole(roles: string[]): PrimaryRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("office")) return "office";
  if (roles.includes("engineer")) return "engineer";
  if (roles.includes("client")) return "client";
  return "client"; // fallback for accounts-only
}

// ---------------------------------------------------------------------------
// GET — List staff members with capabilities
// ---------------------------------------------------------------------------

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;

    const companyUsers = await prisma.companyUser.findMany({
      where: { companyId: cid },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Fetch all enabled permission overrides for this company
    const permissionRows = await prisma.userPermission.findMany({
      where: { companyId: cid, enabled: true },
    });

    // Group capabilities by userId
    const capsByUser: Record<string, string[]> = {};
    for (const row of permissionRows) {
      if (!capsByUser[row.userId]) capsByUser[row.userId] = [];
      capsByUser[row.userId].push(row.key);
    }

    // Count active admins for last-admin guard
    const adminCount = companyUsers.filter(
      (cu: any) => cu.role === "admin" && cu.isActive
    ).length;

    const members = companyUsers.map((cu: any) => ({
      id: cu.userId || cu.id,
      companyUserId: cu.id,
      name: cu.user?.name || null,
      email: cu.user?.email || cu.email,
      role: cu.role,
      isActive: cu.isActive,
      capabilities: capsByUser[cu.userId || cu.id] || [],
    }));

    return NextResponse.json({ ok: true, members, adminCount });
  } catch (error) {
    logError(error, { route: "/api/admin/staff", action: "list" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

// ---------------------------------------------------------------------------
// PUT — Update a user's roles & access
// ---------------------------------------------------------------------------

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
    const { userId, roles, accounts } = body as {
      userId?: string;
      roles?: string[];
      accounts?: boolean;
    };

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ ok: false, error: "userId is required" }, { status: 400 });
    }

    const checkedRoles: string[] = Array.isArray(roles) ? roles : [];
    const wantAccounts = accounts === true;

    // Validate: at least one primary role, or accounts-only
    if (checkedRoles.length === 0 && !wantAccounts) {
      return NextResponse.json(
        { ok: false, error: "At least one role or Accounts must be selected" },
        { status: 400 },
      );
    }

    // Validate: only valid primary roles (finance not accepted)
    for (const r of checkedRoles) {
      if (!(PRIMARY_ROLES as readonly string[]).includes(r)) {
        return NextResponse.json(
          { ok: false, error: `Invalid role: ${r}` },
          { status: 400 },
        );
      }
    }

    // Resolve the single stored role
    const resolvedRole = resolvePrimaryRole(checkedRoles);

    // Accounts guardrail: disallow engineer + accounts
    if (wantAccounts && resolvedRole === "engineer") {
      return NextResponse.json(
        { ok: false, error: "Accounts access cannot be combined with Engineer role" },
        { status: 400 },
      );
    }

    // Find the CompanyUser record
    const companyUser = await prisma.companyUser.findFirst({
      where: { companyId: cid, userId },
    });

    if (!companyUser) {
      return NextResponse.json(
        { ok: false, error: "User not found in this company" },
        { status: 404 },
      );
    }

    // Last-admin guardrail
    if (companyUser.role === "admin" && resolvedRole !== "admin") {
      const adminCount = await prisma.companyUser.count({
        where: { companyId: cid, role: "admin", isActive: true },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { ok: false, error: "Cannot remove the last admin" },
          { status: 403 },
        );
      }
    }

    const previousRole = companyUser.role;

    // 1. Update CompanyUser.role only (NOT User.role)
    await prisma.companyUser.update({
      where: { id: companyUser.id },
      data: { role: resolvedRole },
    });

    // 2. Toggle accounts.access capability
    await prisma.userPermission.upsert({
      where: {
        companyId_userId_key: { companyId: cid, userId, key: "accounts.access" },
      },
      update: { enabled: wantAccounts },
      create: {
        companyId: cid,
        userId,
        key: "accounts.access",
        enabled: wantAccounts,
      },
    });

    // 3. Audit log
    logCriticalAction({
      name: "user.role.changed",
      companyId: cid,
      actorId: authCtx.userId,
      metadata: {
        targetUserId: userId,
        previousRole,
        newRole: resolvedRole,
        checkedRoles,
        accounts: wantAccounts,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError(error, { route: "/api/admin/staff", action: "update_roles" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});
