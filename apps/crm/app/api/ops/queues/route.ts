import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { checkOpsAuth, getOpsClientIp, opsRateLimitRead } from "@/lib/server/opsAuth";
import { logCriticalAction } from "@/lib/server/observability";

export const runtime = "nodejs";

/** Wrap a promise with a timeout so a Redis outage doesn't stall the endpoint. */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

export async function GET(req: Request) {
  const auth = checkOpsAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const rl = opsRateLimitRead(req, "queues");
  if (rl) return rl;

  const prisma = getPrisma();

  const [
    importJobPending,
    importJobFailed,
    notificationsFailed,
    scheduledChecksPending,
    scheduledChecksOverdue,
  ] = await Promise.all([
    prisma.importJob.count({ where: { status: "pending" } }),
    prisma.importJob.count({ where: { status: "failed" } }),
    prisma.notificationLog.count({ where: { status: "failed" } }),
    prisma.scheduledCheck.count({ where: { status: "pending" } }),
    prisma.scheduledCheck.count({ where: { status: "overdue" } }),
  ]);

  // BullMQ queue metrics — isolated with timeout so Redis outage doesn't fail the endpoint
  let bullmq: { healthy: boolean; queues: Record<string, unknown> } | null = null;
  try {
    const { checkQueueHealth } = await import("@/lib/server/queue/queueConfig");
    bullmq = await withTimeout(checkQueueHealth(), 3000, { healthy: false, queues: {} });
  } catch {
    bullmq = { healthy: false, queues: {} };
  }

  const result = {
    ok: true,
    timestamp: new Date().toISOString(),
    queues: {
      importJobs: { pending: importJobPending, failed: importJobFailed },
      notifications: { failed: notificationsFailed },
      scheduledChecks: { pending: scheduledChecksPending, overdue: scheduledChecksOverdue },
    },
    bullmq,
  };

  // Log to OpsAuditLog
  try {
    await prisma.opsAuditLog.create({
      data: {
        action: "queue_query",
        result: result as any,
        ipAddress: getOpsClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
  } catch {
    // best-effort logging
  }

  logCriticalAction({ name: "ops.queue_query", metadata: result.queues });

  return NextResponse.json(result);
}
