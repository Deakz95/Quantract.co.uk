import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { logError } from "@/lib/server/observability";

export const dynamic = "force-dynamic";

// Safe default response - never 500
const SAFE_DEFAULT = {
  ok: true,
  isBeingImpersonated: false,
  impersonatedBy: null,
  isImpersonating: false,
  impersonatingUser: null,
  impersonationId: null,
  startedAt: null,
};

/**
 * GET /api/admin/impersonate/status
 * Returns the current impersonation status for the logged-in user.
 * HARDENED: Never returns 500, always returns safe defaults on error.
 */
export async function GET() {
  try {
    // Use getAuthContext instead of requireRole to avoid throwing
    const ctx = await getAuthContext();

    // No session = safe default (not authenticated)
    if (!ctx) {
      return NextResponse.json(SAFE_DEFAULT);
    }

    // Non-admin = safe default (no impersonation capability)
    if (ctx.role !== "admin") {
      return NextResponse.json(SAFE_DEFAULT);
    }

    // No company = safe default
    if (!ctx.companyId) {
      return NextResponse.json(SAFE_DEFAULT);
    }

    const prisma = getPrisma();

    // Check if this user is currently impersonating someone
    const activeImpersonation = await prisma.impersonation_logs.findFirst({
      where: {
        adminUserId: ctx.userId,
        endedAt: null,
        companyId: ctx.companyId,
      },
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    }).catch(() => null);

    // Check if this user is being impersonated by someone
    const beingImpersonated = await prisma.impersonation_logs.findFirst({
      where: {
        targetUserId: ctx.userId,
        endedAt: null,
        companyId: ctx.companyId,
      },
      include: {
        adminUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      isBeingImpersonated: !!beingImpersonated,
      impersonatedBy: beingImpersonated?.adminUser
        ? {
            id: beingImpersonated.adminUser.id,
            name: beingImpersonated.adminUser.name,
            email: beingImpersonated.adminUser.email,
          }
        : null,
      isImpersonating: !!activeImpersonation,
      impersonatingUser: activeImpersonation?.targetUser
        ? {
            id: activeImpersonation.targetUser.id,
            name: activeImpersonation.targetUser.name,
            email: activeImpersonation.targetUser.email,
            role: activeImpersonation.targetUser.role,
          }
        : null,
      impersonationId: activeImpersonation?.id || beingImpersonated?.id || null,
      startedAt: activeImpersonation?.startedAt || beingImpersonated?.startedAt || null,
    });
  } catch (error) {
    // Log error to Sentry but NEVER return 500
    logError(error, { route: "/api/admin/impersonate/status", action: "get_status" });
    return NextResponse.json(SAFE_DEFAULT);
  }
}
