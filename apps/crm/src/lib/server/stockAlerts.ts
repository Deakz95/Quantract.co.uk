/**
 * Sync low-stock alerts after truck stock mutations.
 *
 * Creates/reopens an alert when qty <= minQty (and minQty > 0),
 * resolves the alert when stock is above threshold or threshold is unset.
 *
 * Deduplication: @@unique([companyId, type, entityId]) on StockAlert.
 */

import { log } from "./logger";

type StockRecord = {
  id: string;
  qty: number;
  minQty: number | null;
  stockItemId: string;
  userId: string;
  stockItem: { name: string };
};

/**
 * Upsert or resolve a truck_stock_low StockAlert for the given record.
 * Only swallows P2002 (unique constraint race); logs all other errors.
 */
export async function syncLowStockAlert(
  prisma: any,
  companyId: string,
  record: StockRecord,
): Promise<void> {
  const isLow =
    record.minQty != null && record.minQty > 0 && record.qty <= record.minQty;

  try {
    if (isLow) {
      await prisma.stockAlert.upsert({
        where: {
          companyId_type_entityId: {
            companyId,
            type: "truck_stock_low",
            entityId: record.id,
          },
        },
        update: {
          status: "open",
          message: `Low stock: ${record.stockItem.name} (${record.qty}/${record.minQty})`,
          meta: {
            stockItemId: record.stockItemId,
            userId: record.userId,
            qty: record.qty,
            minQty: record.minQty,
          },
        },
        create: {
          companyId,
          type: "truck_stock_low",
          entityId: record.id,
          message: `Low stock: ${record.stockItem.name} (${record.qty}/${record.minQty})`,
          meta: {
            stockItemId: record.stockItemId,
            userId: record.userId,
            qty: record.qty,
            minQty: record.minQty,
          },
        },
      });
    } else {
      // Resolve any existing open alert
      await prisma.stockAlert.updateMany({
        where: {
          companyId,
          type: "truck_stock_low",
          entityId: record.id,
          status: "open",
        },
        data: { status: "resolved" },
      });
    }
  } catch (e: any) {
    // P2002 = unique constraint race (another request already upserted) — safe to ignore
    if (e?.code === "P2002") return;
    log.error("stockAlerts", {
      action: "syncLowStockAlert",
      companyId,
      truckStockId: record.id,
      stockItemId: record.stockItemId,
      qty: record.qty,
      minQty: record.minQty,
      isLow,
      error: e?.message ?? e,
    });
  }
}
