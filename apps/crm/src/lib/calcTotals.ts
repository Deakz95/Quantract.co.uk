/**
 * Shared VAT and totals calculator.
 *
 * Single source of truth for all quote/invoice total calculations.
 * Used by: server API routes, PDF rendering, frontend display.
 *
 * Rounding: all money values are rounded to 2dp (pence) using
 * Math.round(n * 100) / 100  to avoid floating-point drift.
 */

export type CalcItem = {
  qty: number;
  unitPrice: number;
};

export type CalcResult = {
  /** Sum of line totals, ex VAT */
  subtotal: number;
  /** VAT amount */
  vat: number;
  /** subtotal + vat */
  total: number;
  /** The VAT rate used (decimal, e.g. 0.2) */
  vatRate: number;
  /** Per-line totals in the same order as input */
  lineTotals: number[];
};

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Calculate subtotal, VAT and total from line items.
 *
 * @param items - Array of {qty, unitPrice} (other fields ignored)
 * @param vatRate - VAT rate as decimal, e.g. 0.2 for 20%. Defaults to 0.2.
 */
export function calcTotals(
  items: CalcItem[],
  vatRate: number = 0.2,
): CalcResult {
  const rate = Number.isFinite(vatRate) ? vatRate : 0.2;

  const lineTotals = (items || []).map((it) =>
    round2((Number(it.qty) || 0) * (Number(it.unitPrice) || 0)),
  );

  // Sum line totals in pence to avoid accumulation drift
  const subtotalPence = lineTotals.reduce(
    (sum, lt) => sum + Math.round(lt * 100),
    0,
  );
  const subtotal = subtotalPence / 100;

  const vat = round2(subtotal * rate);
  const total = round2(subtotal + vat);

  return { subtotal, vat, total, vatRate: rate, lineTotals };
}
