import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { checkOpsAuth, getOpsClientIp, opsRateLimitRead } from "@/lib/server/opsAuth";
import { logCriticalAction } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/ops/tenants/:id
 *
 * Tenant diagnostics endpoint. Returns aggregate usage summary,
 * recent error counts, and audit highlights for a specific company.
 * Keeps data minimal — no sensitive fields (emails, tokens, billing secrets).
 *
 * Auth: OPS_SECRET Bearer token.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = checkOpsAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const rl = opsRateLimitRead(req, "tenants");
  if (rl) return rl;

  const { id: companyId } = await params;
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "missing_company_id" }, { status: 400 });
  }

  const prisma = getPrisma();

  // Verify company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      plan: true,
      subscriptionStatus: true,
      onboardedAt: true,
    },
  });

  if (!company) {
    return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 404 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Run diagnostic queries in parallel
  const [
    storageUsage,
    userCount,
    jobCount,
    invoiceCount,
    recentErrorCount,
    recentAuditEvents,
  ] = await Promise.all([
    // Storage usage
    prisma.companyStorageUsage.findUnique({
      where: { companyId },
      select: { bytesUsed: true, updatedAt: true },
    }).catch(() => null),

    // User count
    prisma.companyUser.count({
      where: { companyId },
    }).catch(() => 0),

    // Job count
    prisma.job.count({
      where: { companyId },
    }).catch(() => 0),

    // Invoice count
    prisma.invoice.count({
      where: { companyId },
    }).catch(() => 0),

    // Recent error audit events (last 7 days)
    prisma.auditEvent.count({
      where: {
        companyId,
        createdAt: { gte: sevenDaysAgo },
        action: { in: ["error", "failed", "send_failed", "payment_failed", "sync_error"] },
      },
    }).catch(() => 0),

    // Recent audit highlights (last 10 events)
    prisma.auditEvent.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        entityType: true,
        action: true,
        actorRole: true,
        createdAt: true,
      },
    }).catch(() => []),
  ]);

  const result = {
    ok: true,
    tenant: {
      id: company.id,
      name: company.name,
      plan: company.plan,
      subscriptionStatus: company.subscriptionStatus,
      onboardedAt: company.onboardedAt,
    },
    usage: {
      storageBytes: storageUsage?.bytesUsed ? Number(storageUsage.bytesUsed) : 0,
      storageUpdatedAt: storageUsage?.updatedAt ?? null,
      userCount,
      jobCount,
      invoiceCount,
    },
    diagnostics: {
      recentErrors7d: recentErrorCount,
      recentAuditHighlights: recentAuditEvents,
    },
    timestamp: now.toISOString(),
  };

  // Log to OpsAuditLog
  try {
    await prisma.opsAuditLog.create({
      data: {
        action: "tenant_diagnostics",
        payload: { companyId } as any,
        result: { companyName: company.name, plan: company.plan } as any,
        ipAddress: getOpsClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
  } catch {
    // best-effort
  }

  logCriticalAction({ name: "ops.tenant_diagnostics", metadata: { companyId } });

  return NextResponse.json(result);
}
