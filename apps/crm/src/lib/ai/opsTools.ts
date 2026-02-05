/**
 * Ops API tools for AI integration.
 *
 * Provides a limited toolset that lets the AI query system health,
 * inspect queue backlogs, cron status, tenant diagnostics, and
 * (with an explicit approval token) retry failed jobs.
 * All invocations are logged to OpsAuditLog.
 */

import { getPrisma } from "@/lib/server/prisma";

// ── Tool definitions (OpenAI function-calling schema) ──

export const OPS_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "ops_health_check",
      description:
        "Check platform health: database connectivity, uptime, and node version.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ops_queue_status",
      description:
        "List queue backlogs: pending imports, failed notifications, overdue checks.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ops_retry_job",
      description:
        "Retry a failed import job by ID. Requires an approval token.",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "The ID of the failed job to retry" },
          approvalToken: {
            type: "string",
            description: "Explicit approval token authorising this action",
          },
        },
        required: ["jobId", "approvalToken"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ops_audit_log",
      description:
        "Retrieve recent ops audit log entries. Read-only.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max entries to return (1–50, default 20)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ops_cron_status",
      description:
        "List all cron jobs with their last run timestamp, status (success/failed/running), duration, and error snippet.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ops_tenant_diagnostics",
      description:
        "Get diagnostics for a specific tenant/company: usage summary, recent errors, audit highlights. Returns only aggregate/non-sensitive data.",
      parameters: {
        type: "object",
        properties: {
          companyId: {
            type: "string",
            description: "The company ID to diagnose",
          },
        },
        required: ["companyId"],
      },
    },
  },
] as const;

// ── Tool executor ──

export type OpsToolResult = { ok: boolean; data?: unknown; error?: string };

export async function executeOpsTool(
  name: string,
  args: Record<string, unknown>,
): Promise<OpsToolResult> {
  const prisma = getPrisma();
  if (!prisma) return { ok: false, error: "database_unavailable" };

  switch (name) {
    case "ops_health_check":
      return executeHealthCheck(prisma);
    case "ops_queue_status":
      return executeQueueStatus(prisma);
    case "ops_retry_job":
      return executeRetryJob(prisma, args);
    case "ops_audit_log":
      return executeAuditLog(prisma, args);
    case "ops_cron_status":
      return executeCronStatus(prisma);
    case "ops_tenant_diagnostics":
      return executeTenantDiagnostics(prisma, args);
    default:
      return { ok: false, error: `unknown_tool: ${name}` };
  }
}

// ── Implementations ──

async function executeHealthCheck(prisma: any): Promise<OpsToolResult> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const result = {
      database: "ok",
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      checkDurationMs: Date.now() - start,
    };
    await logAudit(prisma, "ai.health_check", null, result);
    return { ok: true, data: result };
  } catch {
    const result = { database: "error", timestamp: new Date().toISOString() };
    await logAudit(prisma, "ai.health_check", null, result);
    return { ok: false, error: "database_unreachable", data: result };
  }
}

async function executeQueueStatus(prisma: any): Promise<OpsToolResult> {
  try {
    const [pendingImports, failedNotifs, overdueChecks] = await Promise.all([
      prisma.importJob?.count({ where: { status: "pending" } }).catch(() => 0) ?? 0,
      prisma.notification?.count({ where: { status: "failed" } }).catch(() => 0) ?? 0,
      prisma.scheduledCheck?.count({
        where: { status: "pending", dueAt: { lt: new Date() } },
      }).catch(() => 0) ?? 0,
    ]);

    const result = {
      timestamp: new Date().toISOString(),
      queues: {
        importJobs: { pending: pendingImports },
        notifications: { failed: failedNotifs },
        scheduledChecks: { overdue: overdueChecks },
      },
    };
    await logAudit(prisma, "ai.queue_status", null, result);
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "queue_query_failed" };
  }
}

async function executeRetryJob(
  prisma: any,
  args: Record<string, unknown>,
): Promise<OpsToolResult> {
  const { jobId, approvalToken } = args as { jobId?: string; approvalToken?: string };
  if (!jobId) return { ok: false, error: "jobId required" };
  if (!approvalToken) return { ok: false, error: "approvalToken required for write operations" };

  try {
    const job = await prisma.importJob?.findUnique({ where: { id: jobId } });
    if (!job) return { ok: false, error: "job_not_found" };
    if (job.status !== "failed") return { ok: false, error: `job status is ${job.status}, not failed` };

    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: "pending", errorCount: 0, errors: null },
    });

    const result = { jobId, previousStatus: "failed", newStatus: "pending" };
    await logAudit(prisma, "ai.job_retry", { jobId, approvalToken: "[REDACTED]" }, result);
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "retry_failed" };
  }
}

async function executeAuditLog(
  prisma: any,
  args: Record<string, unknown>,
): Promise<OpsToolResult> {
  const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);

  try {
    const items = await prisma.opsAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return { ok: true, data: { items, count: items.length } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "audit_query_failed" };
  }
}

async function executeCronStatus(prisma: any): Promise<OpsToolResult> {
  try {
    const latestRuns: Array<{
      jobName: string;
      status: string;
      startedAt: Date;
      finishedAt: Date | null;
      durationMs: number | null;
      error: string | null;
    }> = await prisma.$queryRaw`
      SELECT cr."jobName", cr.status, cr."startedAt", cr."finishedAt", cr."durationMs", cr.error
      FROM "CronRun" cr
      INNER JOIN (
        SELECT "jobName", MAX("startedAt") AS "maxStarted"
        FROM "CronRun"
        GROUP BY "jobName"
      ) latest ON cr."jobName" = latest."jobName" AND cr."startedAt" = latest."maxStarted"
      ORDER BY cr."jobName"
    `;

    const jobs = latestRuns.map((run) => ({
      jobName: run.jobName,
      lastRun: run.startedAt,
      status: run.status,
      durationMs: run.durationMs,
      error: run.error ? run.error.slice(0, 500) : null,
    }));

    const result = { timestamp: new Date().toISOString(), jobs };
    await logAudit(prisma, "ai.cron_status", null, { jobCount: jobs.length });
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "cron_query_failed" };
  }
}

async function executeTenantDiagnostics(
  prisma: any,
  args: Record<string, unknown>,
): Promise<OpsToolResult> {
  const { companyId } = args as { companyId?: string };
  if (!companyId) return { ok: false, error: "companyId required" };

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, plan: true, subscriptionStatus: true, onboardedAt: true },
    });
    if (!company) return { ok: false, error: "company_not_found" };

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [storageUsage, userCount, jobCount, invoiceCount, recentErrorCount] =
      await Promise.all([
        prisma.companyStorageUsage
          .findUnique({ where: { companyId }, select: { bytesUsed: true } })
          .catch(() => null),
        prisma.companyUser.count({ where: { companyId } }).catch(() => 0),
        prisma.job.count({ where: { companyId } }).catch(() => 0),
        prisma.invoice.count({ where: { companyId } }).catch(() => 0),
        prisma.auditEvent
          .count({
            where: {
              companyId,
              createdAt: { gte: sevenDaysAgo },
              action: { in: ["error", "failed", "send_failed", "payment_failed", "sync_error"] },
            },
          })
          .catch(() => 0),
      ]);

    const result = {
      tenant: {
        id: company.id,
        name: company.name,
        plan: company.plan,
        subscriptionStatus: company.subscriptionStatus,
        onboardedAt: company.onboardedAt,
      },
      usage: {
        storageBytes: storageUsage?.bytesUsed ? Number(storageUsage.bytesUsed) : 0,
        userCount,
        jobCount,
        invoiceCount,
      },
      diagnostics: { recentErrors7d: recentErrorCount },
    };

    await logAudit(prisma, "ai.tenant_diagnostics", { companyId }, { plan: company.plan });
    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "tenant_query_failed" };
  }
}

// ── Audit helper ──

async function logAudit(
  prisma: any,
  action: string,
  payload: unknown,
  result: unknown,
): Promise<void> {
  try {
    await prisma.opsAuditLog.create({
      data: {
        action,
        payload: payload ?? undefined,
        result: result ?? undefined,
        actorId: "ai",
      },
    });
  } catch {
    // Best-effort logging — don't fail the operation
  }
}
