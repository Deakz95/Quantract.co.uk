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

    // Get activities within date range
    const activities = await db.activity.findMany({
      where: {
        companyId,
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const totalActivities = activities.length;

    // Group by type
    const byType: Record<string, number> = {};
    for (const activity of activities) {
      const type = activity.type || "OTHER";
      byType[type] = (byType[type] || 0) + 1;
    }

    // Group by user
    const userMap = new Map<string, { userId: string; name: string; count: number }>();
    for (const activity of activities) {
      const userId = activity.createdBy;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          name: activity.creator?.name || activity.creator?.email || "Unknown",
          count: 0,
        });
      }
      userMap.get(userId)!.count += 1;
    }

    // Sort users by count descending
    const byUser = Array.from(userMap.values()).sort((a, b) => b.count - a.count);

    return jsonOk({
      totalActivities,
      byType,
      byUser,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[GET /api/admin/reports/activity] Error:", e);
    return jsonErr(e, 500);
  }
});
