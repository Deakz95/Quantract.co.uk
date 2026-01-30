import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  // Never expose raw Prisma/database errors to users
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("prisma") || msg.includes("does not exist") || msg.includes("findmany") || msg.includes("table")) {
      return NextResponse.json({ ok: false, error: "Database tables are being set up. Please try again later." }, { status: 503 });
    }
  }
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
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

    // Default to last 30 days if no dates provided
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    // Ensure default deal stages exist (lazy-seed)
    const existingStageCount = await db.dealStage.count({ where: { companyId } });
    if (existingStageCount === 0) {
      await db.dealStage.createMany({
        data: [
          { companyId, name: "Prospect", sortOrder: 0, color: "#3b82f6", probability: 10, isWon: false, isLost: false, updatedAt: new Date() },
          { companyId, name: "Proposal", sortOrder: 1, color: "#8b5cf6", probability: 30, isWon: false, isLost: false, updatedAt: new Date() },
          { companyId, name: "Negotiation", sortOrder: 2, color: "#f59e0b", probability: 60, isWon: false, isLost: false, updatedAt: new Date() },
          { companyId, name: "Won", sortOrder: 3, color: "#10b981", probability: 100, isWon: true, isLost: false, updatedAt: new Date() },
          { companyId, name: "Lost", sortOrder: 4, color: "#ef4444", probability: 0, isWon: false, isLost: true, updatedAt: new Date() },
        ],
      }).catch(() => null);
    }

    // Get all deal stages for this company
    const dealStages = await db.dealStage.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
    });

    // Get deals within date range grouped by stage
    const deals = await db.deal.findMany({
      where: {
        companyId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        stage: true,
      },
    });

    // Build stage summary
    const stageMap = new Map<string, { name: string; count: number; value: number; probability: number; isWon: boolean; isLost: boolean }>();

    // Initialize all stages
    for (const stage of dealStages) {
      stageMap.set(stage.id, {
        name: stage.name,
        count: 0,
        value: 0,
        probability: stage.probability ?? 0,
        isWon: stage.isWon,
        isLost: stage.isLost,
      });
    }

    // Aggregate deals by stage
    for (const deal of deals) {
      const stageData = stageMap.get(deal.stageId);
      if (stageData) {
        stageData.count += 1;
        stageData.value += deal.value;
      }
    }

    // Convert to array and calculate totals
    const stages = Array.from(stageMap.values()).map((stage) => ({
      name: stage.name,
      count: stage.count,
      value: stage.value,
      probability: stage.probability,
    }));

    const totalValue = stages.reduce((sum, s) => sum + s.value, 0);
    const weightedValue = stages.reduce((sum, s) => sum + (s.value * s.probability) / 100, 0);

    return jsonOk({
      stages,
      totalValue,
      weightedValue,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[GET /api/admin/reports/pipeline] Error:", e);
    return jsonErr(e, 500);
  }
});
