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
 * - Recent errors breakdown by action
 * - Last Stripe webhook timestamp
 * - Cron proxy signals (recent entity activity suggesting crons are running)
 * - Active impersonation sessions count
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
      recentAlertCleanup,
      recentSessionCleanup,
      storageUsage,
    ] = await Promise.all([
      // 1. Error events in last 24h (audit events with "error" or "failed" in action)
      prisma.auditEvent.count({
        where: {
          companyId: ctx.companyId,
          createdAt: { gte: twentyFourHoursAgo },
          action: { in: ["error", "failed", "send_failed", "payment_failed", "sync_error"] },
        },
      }).catch(() => 0),

      // 2. Last Stripe webhook timestamp from CompanyBilling
      prisma.companyBilling.findUnique({
        where: { companyId: ctx.companyId },
        select: { lastWebhookAt: true, lastWebhookEventId: true },
      }).catch(() => null),

      // 3. Active impersonation sessions
      prisma.impersonation_logs.count({
        where: { companyId: ctx.companyId, endedAt: null },
      }).catch(() => 0),

      // 4. Cron proxy: most recent resolved stock alert (cleanup cron indicator)
      prisma.stockAlert.findFirst({
        where: { companyId: ctx.companyId, status: "resolved" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }).catch(() => null),

      // 5. Cron proxy: most recent expired session cleanup (cleanup cron indicator)
      prisma.authSession.findFirst({
        where: { expiresAt: { lt: now } },
        orderBy: { expiresAt: "desc" },
        select: { expiresAt: true },
      }).catch(() => null),

      // 6. Storage usage
      prisma.companyStorageUsage.findUnique({
        where: { companyId: ctx.companyId },
        select: { bytesUsed: true, updatedAt: true },
      }).catch(() => null),
    ]);

    // Determine cron health based on proxy signals
    const cronSignals = {
      stockAlertReconcile: {
        lastActivity: recentAlertCleanup?.updatedAt || null,
        status: getCronStatus(recentAlertCleanup?.updatedAt, 25), // should run every 24h
      },
      sessionCleanup: {
        lastActivity: recentSessionCleanup?.expiresAt || null,
        status: "unknown" as const, // Can't reliably determine from session expiry
      },
      storageReconcile: {
        lastActivity: storageUsage?.updatedAt || null,
        status: getCronStatus(storageUsage?.updatedAt, 25), // should run daily
      },
    };

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
        cronSignals,
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

function getCronStatus(lastActivity: Date | null | undefined, maxHours: number): "green" | "amber" | "red" | "no_data" {
  if (!lastActivity) return "no_data";
  const hoursAgo = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= maxHours) return "green";
  if (hoursAgo <= maxHours * 2) return "amber";
  return "red";
}

function getWebhookStatus(lastAt: Date): "green" | "amber" | "red" {
  const hoursAgo = (Date.now() - new Date(lastAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 24) return "green";
  if (hoursAgo <= 72) return "amber";
  return "red";
}
