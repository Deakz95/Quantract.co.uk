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
    const startDateStr = url.searchParams.get("startDate");
    const endDateStr = url.searchParams.get("endDate");

    // Default to last 30 days
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all engineers
    const engineers = await db.engineer.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
      },
    });

    // Get time entries for each engineer
    const engineerStats = await Promise.all(
      engineers.map(async (engineer: { id: string; name: string; email: string }) => {
        // Total hours worked
        const timeEntries = await db.timeEntry.findMany({
          where: {
            companyId,
            engineerId: engineer.id,
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            startedAt: true,
            endedAt: true,
            breakMinutes: true,
          },
        });

        const totalMinutes = timeEntries.reduce((sum: number, entry: { startedAt: Date; endedAt: Date | null; breakMinutes?: number | null }) => {
          if (!entry.endedAt) return sum;
          const duration =
            (new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()) /
            (1000 * 60);
          return sum + duration - (entry.breakMinutes || 0);
        }, 0);

        const totalHours = totalMinutes / 60;

        // Scheduled jobs
        const scheduledJobs = await db.job.count({
          where: {
            companyId,
            engineerId: engineer.id,
            scheduledAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Completed jobs
        const completedJobs = await db.job.count({
          where: {
            companyId,
            engineerId: engineer.id,
            status: "completed",
            updatedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        // Calculate working days in period
        const daysDiff = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const workingDays = Math.floor(daysDiff / 7) * 5 + (daysDiff % 7);
        const expectedHours = workingDays * 8; // Assume 8-hour workday

        const utilisationRate =
          expectedHours > 0 ? (totalHours / expectedHours) * 100 : 0;

        return {
          engineer: {
            id: engineer.id,
            name: engineer.name || engineer.email,
            email: engineer.email,
          },
          totalHours: Math.round(totalHours * 10) / 10,
          scheduledJobs,
          completedJobs,
          expectedHours,
          utilisationRate: Math.round(utilisationRate * 10) / 10,
        };
      })
    );

    // Sort by utilisation rate descending
    engineerStats.sort((a, b) => b.utilisationRate - a.utilisationRate);

    return jsonOk({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      engineers: engineerStats,
      summary: {
        totalEngineers: engineers.length,
        averageUtilisation:
          engineerStats.length > 0
            ? Math.round(
                (engineerStats.reduce((sum, e) => sum + e.utilisationRate, 0) /
                  engineerStats.length) *
                  10
              ) / 10
            : 0,
        totalHours: engineerStats.reduce((sum, e) => sum + e.totalHours, 0),
        totalJobs: engineerStats.reduce((sum, e) => sum + e.completedJobs, 0),
      },
    });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[GET /api/admin/reports/engineer-utilisation] Error:", e);
    return jsonErr(e, 500);
  }
});
