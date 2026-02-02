export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { isFeatureEnabled } from "@/lib/server/featureFlags";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const companyId = authCtx.companyId;

    // Get company plan for feature flags
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    });
    const plan = company?.plan ?? null;

    const truckInventoryEnabled = isFeatureEnabled(plan, "truck_inventory");
    const maintenanceEnabled = isFeatureEnabled(plan, "maintenance_alerts");

    // Run queries in parallel, only if features are enabled
    const [lowStockCount, openMaintenanceAlertsCount, recentStockChanges] = await Promise.all([
      truckInventoryEnabled
        ? prisma.stockAlert.count({
            where: { companyId, type: "truck_stock_low", status: "open" },
          }).catch(() => 0)
        : 0,

      maintenanceEnabled
        ? prisma.maintenanceAlert.count({
            where: { companyId, status: "open" },
          }).catch(() => 0)
        : 0,

      truckInventoryEnabled
        ? prisma.truckStockLog.findMany({
            where: { companyId },
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              stockItem: { select: { id: true, name: true } },
              user: { select: { id: true, name: true } },
            },
          }).catch(() => [])
        : [],
    ]);

    const enrichedChanges = (recentStockChanges as any[]).map((c: any) => ({
      id: c.id,
      stockItemId: c.stockItemId,
      stockItemName: c.stockItem?.name ?? null,
      userId: c.userId,
      userName: c.user?.name ?? null,
      qtyDelta: c.qtyDelta,
      reason: c.reason,
      jobId: c.jobId,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
    }));

    return NextResponse.json({
      ok: true,
      featureFlags: {
        truck_inventory: truckInventoryEnabled,
        maintenance_alerts: maintenanceEnabled,
      },
      lowStockCount,
      openMaintenanceAlertsCount,
      recentStockChanges: enrichedChanges,
    });
  } catch (error: any) {
    if (error?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    logError(error, { route: "/api/admin/dashboard/widgets", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
