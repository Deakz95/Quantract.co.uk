import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { log } from "@/lib/server/logger";
import { trackCronRun } from "@/lib/server/cronTracker";

export const runtime = "nodejs";

/**
 * Cron endpoint: reconcile StockAlerts with actual TruckStock data.
 *
 * 1. Find TruckStock where qty <= minQty but no open StockAlert → create one.
 * 2. Find open StockAlerts where TruckStock now qty > minQty or deleted → resolve.
 *
 * Idempotent by design — safe to run on any schedule.
 */
export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

  try {
    const result = await trackCronRun("reconcile-alerts", async () => {
      let created = 0;
      let resolved = 0;

      // 1. Find low-stock records missing an open alert
      const lowStockRecords: Array<{
        id: string;
        companyId: string;
        qty: number;
        minQty: number;
        stockItemId: string;
        userId: string;
        stockItemName: string;
      }> = await prisma.$queryRaw`
        SELECT ts.id, ts."companyId", ts.qty, ts."minQty", ts."stockItemId", ts."userId",
               si.name AS "stockItemName"
        FROM "TruckStock" ts
        JOIN "StockItem" si ON si.id = ts."stockItemId"
        WHERE ts."minQty" > 0
          AND ts.qty <= ts."minQty"
          AND NOT EXISTS (
            SELECT 1 FROM "StockAlert" sa
            WHERE sa."companyId" = ts."companyId"
              AND sa.type = 'truck_stock_low'
              AND sa."entityId" = ts.id
              AND sa.status = 'open'
          )
      `;

      for (const r of lowStockRecords) {
        try {
          await prisma.stockAlert.create({
            data: {
              companyId: r.companyId,
              type: "truck_stock_low",
              entityId: r.id,
              message: `Low stock: ${r.stockItemName} (${r.qty}/${r.minQty})`,
              meta: {
                stockItemId: r.stockItemId,
                userId: r.userId,
                qty: r.qty,
                minQty: r.minQty,
                source: "reconciliation",
              },
            },
          });
          created++;
        } catch (e: any) {
          if (e?.code !== "P2002") {
            log.warn("cron/reconcile-alerts", { action: "create_failed", truckStockId: r.id, error: e?.message });
          }
        }
      }

      // 2. Resolve orphaned alerts (TruckStock deleted or no longer low)
      const orphanedAlerts: Array<{ id: string }> = await prisma.$queryRaw`
        SELECT sa.id
        FROM "StockAlert" sa
        WHERE sa.type = 'truck_stock_low'
          AND sa.status = 'open'
          AND NOT EXISTS (
            SELECT 1 FROM "TruckStock" ts
            WHERE ts.id = sa."entityId"
              AND ts."companyId" = sa."companyId"
              AND ts."minQty" > 0
              AND ts.qty <= ts."minQty"
          )
      `;

      if (orphanedAlerts.length > 0) {
        const ids = orphanedAlerts.map((a) => a.id);
        const r = await prisma.stockAlert.updateMany({
          where: { id: { in: ids } },
          data: { status: "resolved" },
        });
        resolved = r.count;
      }

      log.info("cron/reconcile-alerts", { created, resolved });
      return { created, resolved };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    log.error("cron/reconcile-alerts", { error: e?.message });
    return NextResponse.json({ ok: false, error: "cron_failed" }, { status: 500 });
  }
}
