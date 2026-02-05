export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 86400000);

    const [overdueChecks, upcomingChecks, unresolvedObservations, assetsDue] = await Promise.all([
      // Overdue scheduled checks
      prisma.scheduledCheck.findMany({
        where: { companyId: cid, status: "overdue" },
        include: {
          asset: { select: { id: true, name: true, type: true, identifier: true } },
          template: { select: { id: true, title: true } },
        },
        orderBy: { dueAt: "asc" },
        take: 50,
      }),

      // Upcoming checks (due within 30 days, not overdue)
      prisma.scheduledCheck.findMany({
        where: {
          companyId: cid,
          status: "pending",
          dueAt: { gte: now, lte: thirtyDaysOut },
        },
        include: {
          asset: { select: { id: true, name: true, type: true, identifier: true } },
          template: { select: { id: true, title: true } },
        },
        orderBy: { dueAt: "asc" },
        take: 50,
      }),

      // Unresolved certificate observations
      prisma.certificateObservation.count({
        where: { companyId: cid, resolvedAt: null },
      }),

      // Assets with scheduled checks due
      prisma.asset.findMany({
        where: {
          companyId: cid,
          status: "active",
          scheduledChecks: {
            some: { status: { in: ["overdue", "pending"] } },
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          identifier: true,
          scheduledChecks: {
            where: { status: { in: ["overdue", "pending"] } },
            select: { id: true, title: true, status: true, dueAt: true },
            orderBy: { dueAt: "asc" },
            take: 3,
          },
        },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        overdueChecks,
        upcomingChecks,
        unresolvedObservations,
        assetsDue,
        summary: {
          overdueCount: overdueChecks.length,
          upcomingCount: upcomingChecks.length,
          unresolvedObservations,
          assetsWithIssues: assetsDue.length,
        },
      },
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/office/compliance", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
