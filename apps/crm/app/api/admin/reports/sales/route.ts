import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

type GroupBy = "day" | "week" | "month";

function getDateKey(date: Date, groupBy: GroupBy): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  switch (groupBy) {
    case "day":
      return `${year}-${month}-${day}`;
    case "week": {
      // Get the Monday of the week
      const d = new Date(date);
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      d.setDate(diff);
      const weekMonth = String(d.getMonth() + 1).padStart(2, "0");
      const weekDay = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${weekMonth}-${weekDay}`;
    }
    case "month":
      return `${year}-${month}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    await requireRoles("admin");
    const companyId = await requireCompanyId();

    const db = getPrisma();
    if (!db) {
      return jsonErr("Database not available", 503);
    }

    const url = new URL(req.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    const groupBy = (url.searchParams.get("groupBy") as GroupBy) || "day";

    // Default to last 30 days if no dates provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    // Get won and lost stages
    const wonStages = await db.dealStage.findMany({
      where: { companyId, isWon: true },
      select: { id: true },
    });
    const lostStages = await db.dealStage.findMany({
      where: { companyId, isLost: true },
      select: { id: true },
    });

    const wonStageIds = wonStages.map((s: { id: string }) => s.id);
    const lostStageIds = lostStages.map((s: { id: string }) => s.id);

    // Get deals closed within date range
    const closedDeals = await db.deal.findMany({
      where: {
        companyId,
        closedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        stage: true,
      },
    });

    // Calculate metrics
    const wonDeals = closedDeals.filter((d: typeof closedDeals[number]) => wonStageIds.includes(d.stageId));
    const lostDeals = closedDeals.filter((d: typeof closedDeals[number]) => lostStageIds.includes(d.stageId));

    const wonCount = wonDeals.length;
    const lostCount = lostDeals.length;
    const totalValue = wonDeals.reduce((sum: number, d: typeof wonDeals[number]) => sum + d.value, 0);
    const avgDealSize = wonCount > 0 ? totalValue / wonCount : 0;
    const conversionRate = wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

    // Group by time period for chart data
    const dataPointsMap = new Map<string, { date: string; won: number; lost: number; value: number }>();

    for (const deal of closedDeals) {
      if (!deal.closedAt) continue;
      const key = getDateKey(deal.closedAt, groupBy);

      if (!dataPointsMap.has(key)) {
        dataPointsMap.set(key, { date: key, won: 0, lost: 0, value: 0 });
      }

      const point = dataPointsMap.get(key)!;
      if (wonStageIds.includes(deal.stageId)) {
        point.won += 1;
        point.value += deal.value;
      } else if (lostStageIds.includes(deal.stageId)) {
        point.lost += 1;
      }
    }

    // Sort data points by date
    const dataPoints = Array.from(dataPointsMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return jsonOk({
      wonDeals: wonCount,
      lostDeals: lostCount,
      totalValue,
      avgDealSize,
      conversionRate,
      dataPoints,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[GET /api/admin/reports/sales] Error:", e);
    return jsonErr(e, 500);
  }
});
