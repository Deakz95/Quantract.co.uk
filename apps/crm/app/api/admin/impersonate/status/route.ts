import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/impersonate/status
 * Returns the current impersonation status for the logged-in user
 */
export async function GET() {
  try {
    const ctx = await requireRole("admin");
    const prisma = p();

    // Check if this user is currently impersonating someone
    const activeImpersonation = await prisma.impersonation_logs.findFirst({
      where: {
        adminUserId: ctx.userId,
        endedAt: null,
        companyId: ctx.companyId || undefined,
      },
      include: {
        User_impersonation_logs_targetUserIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    // Check if this user is being impersonated by someone
    const beingImpersonated = await prisma.impersonation_logs.findFirst({
      where: {
        targetUserId: ctx.userId,
        endedAt: null,
        companyId: ctx.companyId || undefined,
      },
      include: {
        User_impersonation_logs_adminUserIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({
      isBeingImpersonated: !!beingImpersonated,
      impersonatedBy: beingImpersonated
        ? {
            id: beingImpersonated.User_impersonation_logs_adminUserIdToUser.id,
            name: beingImpersonated.User_impersonation_logs_adminUserIdToUser.name,
            email: beingImpersonated.User_impersonation_logs_adminUserIdToUser.email,
          }
        : null,
      isImpersonating: !!activeImpersonation,
      impersonatingUser: activeImpersonation
        ? {
            id: activeImpersonation.User_impersonation_logs_targetUserIdToUser.id,
            name: activeImpersonation.User_impersonation_logs_targetUserIdToUser.name,
            email: activeImpersonation.User_impersonation_logs_targetUserIdToUser.email,
            role: activeImpersonation.User_impersonation_logs_targetUserIdToUser.role,
          }
        : null,
      impersonationId: activeImpersonation?.id || beingImpersonated?.id || null,
      startedAt: activeImpersonation?.startedAt || beingImpersonated?.startedAt || null,
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json(
        {
          ok: false,
          isBeingImpersonated: false,
          impersonatedBy: null,
          isImpersonating: false,
          impersonatingUser: null,
          impersonationId: null,
        },
        { status: error.status, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Impersonation status error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch impersonation status" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
