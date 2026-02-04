/**
 * Ops API tools for AI integration.
 *
 * Provides a limited toolset that lets the AI query system health,
 * inspect queue backlogs, and (with an explicit approval token)
 * retry failed jobs. All invocations are logged to OpsAuditLog.
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
