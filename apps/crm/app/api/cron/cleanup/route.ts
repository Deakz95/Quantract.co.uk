import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { log } from "@/lib/server/logger";
import { trackCronRun } from "@/lib/server/cronTracker";

export const runtime = "nodejs";

/**
 * Cron endpoint: periodic data cleanup.
 *
 * - Delete expired auth sessions (>30 days old)
 * - Purge resolved StockAlerts older than 90 days
 *
 * Idempotent — safe to run repeatedly.
 */
export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

  try {
    const results = await trackCronRun("cleanup", async () => {
      const r: Record<string, number> = {};

      // 1. Expired auth sessions (>30 days)
      const sessionCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      try {
        const sessions = await prisma.authSession.deleteMany({
          where: { expiresAt: { lt: sessionCutoff } },
        });
        r.expiredSessions = sessions.count;
      } catch {
        r.expiredSessions = -1; // table may not exist or schema mismatch
      }

      // 2. Resolved StockAlerts older than 90 days
      const alertCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      try {
        const alerts = await prisma.stockAlert.deleteMany({
          where: { status: "resolved", updatedAt: { lt: alertCutoff } },
        });
        r.oldResolvedAlerts = alerts.count;
      } catch {
        r.oldResolvedAlerts = -1;
      }

      // 3. OpsAuditLog entries older than 90 days (batched delete to avoid long locks)
      const opsLogCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      try {
        let totalPruned = 0;
        const BATCH = 500;
        for (let i = 0; i < 20; i++) {
          const count = await prisma.$executeRaw`
            DELETE FROM "OpsAuditLog"
            WHERE id IN (
              SELECT id FROM "OpsAuditLog"
              WHERE "createdAt" < ${opsLogCutoff}
              LIMIT ${BATCH}
            )
          `;
          totalPruned += count;
          if (count < BATCH) break;
        }
        r.opsAuditLogPruned = totalPruned;
      } catch {
        r.opsAuditLogPruned = -1;
      }

      log.info("cron/cleanup", r);
      return r;
    });

    return NextResponse.json({ ok: true, ...results });
  } catch (e: any) {
    log.error("cron/cleanup", { error: e?.message });
    return NextResponse.json({ ok: false, error: "cron_failed" }, { status: 500 });
  }
}
