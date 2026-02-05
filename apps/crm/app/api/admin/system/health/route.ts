import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/admin/system/health
 *
 * Returns system health signals for admin dashboard:
 * - Recent error count (AuditEvent errors in last 24h)
 * - Last Stripe webhook timestamp
 * - Real cron job status from CronRun table
 * - Active impersonation sessions count
 * - Storage usage
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const ctx = await requireCompanyContext();
    const role = getEffectiveRole(ctx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Run all queries in parallel for performance
    const [
      errorEvents,
      lastWebhook,
      activeImpersonations,
      storageUsage,
      cronRuns,
    ] = await Promise.all([
      // 1. Error events in last 24h
      prisma.auditEvent.count({
        where: {
          companyId: ctx.companyId,
          createdAt: { gte: twentyFourHoursAgo },
          action: { in: ["error", "failed", "send_failed", "payment_failed", "sync_error"] },
        },
      }).catch(() => 0),

      // 2. Last Stripe webhook timestamp
      prisma.companyBilling.findUnique({
        where: { companyId: ctx.companyId },
        select: { lastWebhookAt: true, lastWebhookEventId: true },
      }).catch(() => null),

      // 3. Active impersonation sessions
      prisma.impersonation_logs.count({
        where: { companyId: ctx.companyId, endedAt: null },
      }).catch(() => 0),

      // 4. Storage usage
      prisma.companyStorageUsage.findUnique({
        where: { companyId: ctx.companyId },
        select: { bytesUsed: true, updatedAt: true },
      }).catch(() => null),

      // 5. Real cron job status — latest run per job
      (prisma.$queryRaw`
        SELECT cr.id, cr."jobName", cr.status, cr."startedAt", cr."finishedAt", cr."durationMs", cr.error
        FROM "CronRun" cr
        INNER JOIN (
          SELECT "jobName", MAX("startedAt") AS "maxStarted"
          FROM "CronRun"
          GROUP BY "jobName"
        ) latest ON cr."jobName" = latest."jobName" AND cr."startedAt" = latest."maxStarted"
        ORDER BY cr."jobName"
      ` as Promise<Array<{
        id: string;
        jobName: string;
        status: string;
        startedAt: Date;
        finishedAt: Date | null;
        durationMs: number | null;
        error: string | null;
      }>>).catch(() => [] as Array<{
        id: string;
        jobName: string;
        status: string;
        startedAt: Date;
        finishedAt: Date | null;
        durationMs: number | null;
        error: string | null;
      }>),
    ]);

    // Build cron status from real CronRun data
    const cronJobs = cronRuns.map((run) => {
      const hoursAgo = run.startedAt
        ? (Date.now() - new Date(run.startedAt).getTime()) / (1000 * 60 * 60)
        : null;

      let indicator: "green" | "amber" | "red" | "unknown" = "unknown";
      if (run.status === "failed") {
        indicator = "red";
      } else if (run.status === "running") {
        indicator = "amber";
      } else if (hoursAgo !== null) {
        indicator = hoursAgo <= 25 ? "green" : hoursAgo <= 50 ? "amber" : "red";
      }

      return {
        jobName: run.jobName,
        lastRun: run.startedAt,
        status: run.status,
        durationMs: run.durationMs,
        error: run.error ? run.error.slice(0, 200) : null,
        indicator,
      };
    });

    // Webhook health
    const webhookHealth = {
      lastWebhookAt: lastWebhook?.lastWebhookAt || null,
      lastEventId: lastWebhook?.lastWebhookEventId || null,
      status: lastWebhook?.lastWebhookAt
        ? getWebhookStatus(lastWebhook.lastWebhookAt)
        : "no_data" as const,
    };

    return NextResponse.json({
      ok: true,
      health: {
        errorCount24h: errorEvents,
        errorStatus: errorEvents === 0 ? "green" : errorEvents < 5 ? "amber" : "red",
        activeImpersonations,
        webhookHealth,
        cronJobs,
        storageBytes: storageUsage?.bytesUsed ? Number(storageUsage.bytesUsed) : 0,
        checkedAt: now.toISOString(),
      },
    });
  } catch (error) {
    logError(error, { route: "/api/admin/system/health", action: "get" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "health_check_failed" }, { status: 500 });
  }
});

function getWebhookStatus(lastAt: Date): "green" | "amber" | "red" {
  const hoursAgo = (Date.now() - new Date(lastAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 24) return "green";
  if (hoursAgo <= 72) return "amber";
  return "red";
}
