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

    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get completed jobs with time entries
    const jobs = await db.job.findMany({
      where: {
        companyId,
        status: "completed",
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        timeEntries: {
          select: {
            startedAt: true,
            endedAt: true,
            breakMinutes: true,
          },
        },
        quote: {
          select: {
            items: true,
          },
        },
        engineer: {
          select: { name: true, email: true },
        },
      },
    });

    const jobStats = jobs.map((job: any) => {
      // Calculate actual hours from time entries
      const actualMinutes = job.timeEntries.reduce((sum: number, entry: { startedAt: Date; endedAt: Date | null; breakMinutes?: number | null }) => {
        if (!entry.endedAt) return sum;
        const duration =
          (new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()) /
          (1000 * 60);
        return sum + duration - (entry.breakMinutes || 0);
      }, 0);

      const actualHours = actualMinutes / 60;

      // Estimate hours from quote items (labour items)
      // This is a simplified calculation - actual implementation may vary
      let estimatedHours = 0;
      if (job.quote?.items && Array.isArray(job.quote.items)) {
        estimatedHours = job.quote.items.reduce((sum: number, item: any) => {
          // Assume labour items have type === 'labour' and quantity represents hours
          if (item.type === "labour") {
            return sum + (item.quantity || 0);
          }
          return sum;
        }, 0);
      }

      const variance = actualHours - estimatedHours;
      const variancePercent =
        estimatedHours > 0 ? (variance / estimatedHours) * 100 : 0;

      return {
        job: {
          id: job.id,
          title: job.title,
          engineer: job.engineer?.name || job.engineer?.email,
        },
        estimatedHours: Math.round(estimatedHours * 10) / 10,
        actualHours: Math.round(actualHours * 10) / 10,
        variance: Math.round(variance * 10) / 10,
        variancePercent: Math.round(variancePercent * 10) / 10,
        status: variance > 0 ? "overrun" : variance < 0 ? "underrun" : "on-time",
      };
    });

    // Calculate summary stats
    const totalEstimated = jobStats.reduce((sum: number, j: any) => sum + j.estimatedHours, 0);
    const totalActual = jobStats.reduce((sum: number, j: any) => sum + j.actualHours, 0);
    const totalVariance = totalActual - totalEstimated;

    const overruns = jobStats.filter((j: any) => j.variance > 0);
    const underruns = jobStats.filter((j: any) => j.variance < 0);
    const onTime = jobStats.filter((j: any) => j.variance === 0);

    return jsonOk({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      jobs: jobStats,
      summary: {
        totalJobs: jobStats.length,
        totalEstimatedHours: Math.round(totalEstimated * 10) / 10,
        totalActualHours: Math.round(totalActual * 10) / 10,
        totalVariance: Math.round(totalVariance * 10) / 10,
        variancePercent:
          totalEstimated > 0
            ? Math.round((totalVariance / totalEstimated) * 100 * 10) / 10
            : 0,
        overruns: overruns.length,
        underruns: underruns.length,
        onTime: onTime.length,
        avgEstimate:
          jobStats.length > 0
            ? Math.round((totalEstimated / jobStats.length) * 10) / 10
            : 0,
        avgActual:
          jobStats.length > 0
            ? Math.round((totalActual / jobStats.length) * 10) / 10
            : 0,
      },
    });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[GET /api/admin/reports/time-vs-estimate] Error:", e);
    return jsonErr(e, 500);
  }
});
