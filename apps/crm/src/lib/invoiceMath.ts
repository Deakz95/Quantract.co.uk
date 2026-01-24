// src/lib/invoiceMath.ts

/**
 * Clamp monetary values to 2 decimal places (pence/cents precision).
 * Handles non-finite numbers gracefully by returning 0.
 */
export function clampMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function percentOf(amount: number, pct: number) {
  return clampMoney((amount * pct) / 100);
}

export function remainingBalance(total: number, paid: number) {
  return clampMoney(Math.max(0, total - paid));
}

/**
 * VAT Calculation Types and Functions
 *
 * CRITICAL: All VAT calculations must be mathematically correct and auditable.
 */

export interface VATCalculation {
  subtotal: number;
  vat: number;
  total: number;
  vatRate: number;
}

/**
 * Calculate VAT from a subtotal (VAT-exclusive amount).
 *
 * Example: £100 subtotal at 20% VAT = £20 VAT, £120 total
 *
 * @param subtotal - The VAT-exclusive amount
 * @param vatRate - VAT rate as decimal (e.g., 0.2 for 20%)
 */
export function calculateVATFromSubtotal(subtotal: number, vatRate: number): VATCalculation {
  const clampedSubtotal = clampMoney(subtotal);
  const clampedRate = Number(vatRate);
  const vat = clampMoney(clampedSubtotal * clampedRate);
  const total = clampMoney(clampedSubtotal + vat);

  return {
    subtotal: clampedSubtotal,
    vat,
    total,
    vatRate: clampedRate,
  };
}

/**
 * Calculate VAT-exclusive subtotal from a VAT-inclusive total.
 *
 * Example: £120 total at 20% VAT = £100 subtotal, £20 VAT
 *
 * Formula: subtotal = total / (1 + vatRate)
 *
 * @param total - The VAT-inclusive total amount
 * @param vatRate - VAT rate as decimal (e.g., 0.2 for 20%)
 */
export function calculateSubtotalFromTotal(total: number, vatRate: number): VATCalculation {
  const clampedTotal = clampMoney(total);
  const clampedRate = Number(vatRate);

  // Avoid division by zero
  if (clampedRate <= -1) {
    return {
      subtotal: 0,
      vat: 0,
      total: clampedTotal,
      vatRate: clampedRate,
    };
  }

  const subtotal = clampMoney(clampedTotal / (1 + clampedRate));
  const vat = clampMoney(clampedTotal - subtotal);

  return {
    subtotal,
    vat,
    total: clampedTotal,
    vatRate: clampedRate,
  };
}

/**
 * Calculate zero-rated VAT (0% VAT).
 * Used for exempt goods/services.
 *
 * @param subtotal - The amount (no VAT applied)
 */
export function calculateZeroRatedVAT(subtotal: number): VATCalculation {
  const clampedSubtotal = clampMoney(subtotal);

  return {
    subtotal: clampedSubtotal,
    vat: 0,
    total: clampedSubtotal,
    vatRate: 0,
  };
}

/**
 * Validate that a VAT calculation is mathematically correct.
 *
 * INVARIANT: total = subtotal + vat (within rounding tolerance)
 *
 * @param calc - The VAT calculation to validate
 * @returns true if valid, false otherwise
 */
export function validateVATCalculation(calc: VATCalculation): boolean {
  const expectedTotal = clampMoney(calc.subtotal + calc.vat);
  const tolerance = 0.01; // 1 penny tolerance for rounding

  return Math.abs(calc.total - expectedTotal) <= tolerance;
}
