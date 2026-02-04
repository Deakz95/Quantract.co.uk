import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { checkOpsAuth, getApprovalToken, getOpsClientIp, redactSensitive } from "@/lib/server/opsAuth";
import { logCriticalAction } from "@/lib/server/observability";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = checkOpsAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  // Write actions require an explicit approval token
  const approvalToken = getApprovalToken(req);
  if (!approvalToken) {
    return NextResponse.json(
      { ok: false, error: "missing_approval_token", message: "X-Approval-Token header is required for write actions" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const prisma = getPrisma();

  // Look up the ImportJob
  const job = await prisma.importJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ ok: false, error: "job_not_found" }, { status: 404 });
  }

  if (job.status !== "failed") {
    return NextResponse.json(
      { ok: false, error: "job_not_failed", currentStatus: job.status },
      { status: 409 },
    );
  }

  // Reset to pending for retry
  await prisma.importJob.update({
    where: { id },
    data: { status: "pending", errorCount: 0, errors: null },
  });

  const result = {
    ok: true,
    jobId: id,
    previousStatus: "failed",
    newStatus: "pending",
  };

  // Log to OpsAuditLog (redact approval token)
  try {
    await prisma.opsAuditLog.create({
      data: {
        action: "job_retry",
        payload: redactSensitive({ jobId: id, companyId: job.companyId, entityType: job.entityType }) as any,
        result: result as any,
        ipAddress: getOpsClientIp(req),
        userAgent: req.headers.get("user-agent"),
        approvalToken: "[REDACTED]",
      },
    });
  } catch {
    // best-effort logging
  }

  logCriticalAction({
    name: "ops.job_retry",
    metadata: { jobId: id, companyId: job.companyId },
  });

  return NextResponse.json(result);
}
