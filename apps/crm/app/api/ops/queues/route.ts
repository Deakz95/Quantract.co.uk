import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { checkOpsAuth, getOpsClientIp } from "@/lib/server/opsAuth";
import { logCriticalAction } from "@/lib/server/observability";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = checkOpsAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

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

  const result = {
    ok: true,
    timestamp: new Date().toISOString(),
    queues: {
      importJobs: { pending: importJobPending, failed: importJobFailed },
      notifications: { failed: notificationsFailed },
      scheduledChecks: { pending: scheduledChecksPending, overdue: scheduledChecksOverdue },
    },
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
