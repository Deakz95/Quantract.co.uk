import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { checkOpsAuth, getOpsClientIp, opsRateLimitRead } from "@/lib/server/opsAuth";
import { logCriticalAction } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/ops/crons
 *
 * Returns the latest CronRun per jobName with status, duration, and error info.
 * Auth: OPS_SECRET Bearer token.
 */
export async function GET(req: Request) {
  const auth = checkOpsAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const rl = opsRateLimitRead(req, "crons");
  if (rl) return rl;

  const prisma = getPrisma();

  // Get the latest run for each job using a subquery approach
  const latestRuns: Array<{
    id: string;
    jobName: string;
    status: string;
    startedAt: Date;
    finishedAt: Date | null;
    durationMs: number | null;
    error: string | null;
  }> = await prisma.$queryRaw`
    SELECT cr.id, cr."jobName", cr.status, cr."startedAt", cr."finishedAt", cr."durationMs", cr.error
    FROM "CronRun" cr
    INNER JOIN (
      SELECT "jobName", MAX("startedAt") AS "maxStarted"
      FROM "CronRun"
      GROUP BY "jobName"
    ) latest ON cr."jobName" = latest."jobName" AND cr."startedAt" = latest."maxStarted"
    ORDER BY cr."jobName"
  `;

  const jobs = latestRuns.map((run) => {
    const hoursAgo = run.startedAt
      ? (Date.now() - new Date(run.startedAt).getTime()) / (1000 * 60 * 60)
      : null;

    let indicator: "green" | "amber" | "red" | "unknown" = "unknown";
    if (run.status === "failed") {
      indicator = "red";
    } else if (run.status === "running") {
      indicator = "amber";
    } else if (hoursAgo !== null) {
      // Most crons run daily; green if within 25h, amber within 50h, red beyond
      indicator = hoursAgo <= 25 ? "green" : hoursAgo <= 50 ? "amber" : "red";
    }

    return {
      jobName: run.jobName,
      lastRun: run.startedAt,
      status: run.status,
      durationMs: run.durationMs,
      error: run.error ? run.error.slice(0, 500) : null,
      indicator,
    };
  });

  const result = {
    ok: true,
    timestamp: new Date().toISOString(),
    jobs,
  };

  // Log to OpsAuditLog
  try {
    await prisma.opsAuditLog.create({
      data: {
        action: "cron_status_query",
        result: { jobCount: jobs.length } as any,
        ipAddress: getOpsClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
  } catch {
    // best-effort
  }

  logCriticalAction({ name: "ops.cron_status_query", metadata: { jobCount: jobs.length } });

  return NextResponse.json(result);
}
