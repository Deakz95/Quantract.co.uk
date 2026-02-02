import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
    }

    const companyId = authCtx.companyId;

    // Get all deals with stages
    const deals = await prisma.deal.findMany({
      where: { companyId },
      include: { stage: true },
    });

    // Pipeline stats
    const wonDeals = deals.filter((d: any) => d.stage?.isWon);
    const lostDeals = deals.filter((d: any) => d.stage?.isLost);
    const closedDeals = [...wonDeals, ...lostDeals];
    const openDeals = deals.filter((d: any) => !d.stage?.isWon && !d.stage?.isLost);

    const winRate = closedDeals.length > 0
      ? Math.round((wonDeals.length / closedDeals.length) * 100)
      : 0;

    const allValues = deals.map((d: any) => d.value || 0).filter((v: number) => v > 0);
    const avgDealSize = allValues.length > 0
      ? Math.round(allValues.reduce((a: number, b: number) => a + b, 0) / allValues.length)
      : 0;

    // Average days in current stage (for open deals)
    const now = new Date();
    const stageDays = openDeals.map((d: any) => {
      const updated = new Date(d.updatedAt);
      return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
    });
    const avgDaysInStage = stageDays.length > 0
      ? Math.round(stageDays.reduce((a: number, b: number) => a + b, 0) / stageDays.length)
      : 0;

    const totalPipelineValue = openDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0);

    // Insights
    const insights: Array<{ type: "warning" | "info" | "success"; title: string; message: string; dealId?: string }> = [];

    // Stale deals (>14 days no movement)
    const staleDeals = openDeals.filter((d: any) => {
      const updated = new Date(d.updatedAt);
      const days = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
      return days > 14;
    });
    for (const d of staleDeals.slice(0, 3)) {
      const days = Math.floor((now.getTime() - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
      insights.push({
        type: "warning",
        title: `"${d.title}" is stale`,
        message: `No activity for ${days} days in ${(d as any).stage?.name || "unknown stage"}. Consider following up.`,
        dealId: d.id,
      });
    }

    // Overdue close dates
    const overdueDeals = openDeals.filter((d: any) => d.expectedCloseDate && new Date(d.expectedCloseDate) < now);
    for (const d of overdueDeals.slice(0, 2)) {
      insights.push({
        type: "warning",
        title: `"${d.title}" is overdue`,
        message: `Expected close date was ${new Date(d.expectedCloseDate!).toLocaleDateString("en-GB")}. Update the close date or move to won/lost.`,
        dealId: d.id,
      });
    }

    // High-value at risk
    const highValueStale = staleDeals
      .filter((d: any) => (d.value || 0) > avgDealSize * 1.5)
      .slice(0, 2);
    for (const d of highValueStale) {
      if (!insights.some((i) => i.dealId === d.id)) {
        insights.push({
          type: "warning",
          title: `High-value deal at risk`,
          message: `"${d.title}" worth £${d.value?.toLocaleString()} has gone quiet. Prioritise this one.`,
          dealId: d.id,
        });
      }
    }

    // Positive insight
    if (winRate > 50) {
      insights.push({
        type: "success",
        title: "Strong win rate",
        message: `Your ${winRate}% win rate is above average. Keep up the momentum.`,
      });
    }

    if (openDeals.length > 0 && staleDeals.length === 0) {
      insights.push({
        type: "success",
        title: "Pipeline is active",
        message: "All open deals have recent activity. Good pipeline hygiene.",
      });
    }

    return NextResponse.json({
      ok: true,
      stats: {
        winRate,
        avgDealSize,
        avgDaysInStage,
        totalPipelineValue,
        openDeals: openDeals.length,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
      },
      insights: insights.slice(0, 5),
    });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[GET /api/admin/deals/recommendations]", e);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }
});
