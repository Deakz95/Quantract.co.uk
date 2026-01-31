/**
 * Break-even tracker – server-side helpers.
 *
 * All monetary values are in pence (integer) to avoid floating-point drift.
 * The dashboard and AI context consume the output of `computeBreakEven`.
 *
 * Date logic uses London date parts (year/month/day) so callers should pass
 * values derived from `toLondonDateParts()` — this avoids UTC midnight drift.
 */

import {
  toLondonDateParts,
  londonLastDayOfMonth,
  londonDayOfWeek,
} from "@/lib/time/london";

// ─── Types ───────────────────────────────────────────────────────────

export type OverheadRow = {
  label: string;
  amountPence: number;
  frequency: "monthly" | "weekly" | "annual";
};

export type RateCardRow = {
  name: string;
  costRatePerHour: number; // float £
  chargeRatePerHour: number; // float £
  isDefault: boolean;
};

export type RevenueSnapshot = {
  thisMonthPence: number;
  lastMonthPence: number;
};

export type BreakEvenResult = {
  /** Total monthly overhead in pence */
  monthlyOverheadPence: number;
  /** Weighted average margin ratio (0–1) from rate cards */
  avgMarginRatio: number;
  /** Revenue needed this month to cover overheads (pence) */
  breakEvenRevenuePence: number;
  /** Revenue earned so far this month (pence) */
  earnedPence: number;
  /** Percentage progress toward break-even (0–100+) */
  progressPercent: number;
  /** Pence remaining to break even (negative = surplus) */
  remainingPence: number;
  /** Working days (Mon–Fri) left in current month, including today if today is a working day. Always >= 1. */
  daysLeft: number;
  /** Required daily revenue to hit break-even from today (pence), based on working days */
  requiredDailyPence: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────

/** Normalise any overhead frequency to a monthly pence amount. */
export function toMonthlyPence(row: OverheadRow): number {
  switch (row.frequency) {
    case "weekly":
      return Math.round(row.amountPence * (52 / 12));
    case "annual":
      return Math.round(row.amountPence / 12);
    case "monthly":
    default:
      return row.amountPence;
  }
}

/** Sum all overheads to a single monthly figure (pence). */
export function totalMonthlyOverheadPence(rows: OverheadRow[]): number {
  return rows.reduce((sum, r) => sum + toMonthlyPence(r), 0);
}

/**
 * Compute a weighted-average margin ratio from rate cards.
 * If only one card exists it is used directly.
 * Falls back to 0.3 (30 %) when no cards are configured.
 */
export function avgMarginFromRateCards(cards: RateCardRow[]): number {
  if (cards.length === 0) return 0.3;

  // Prefer default card if exactly one is marked
  const defaults = cards.filter((c) => c.isDefault);
  const pool = defaults.length === 1 ? defaults : cards;

  let totalCharge = 0;
  let totalCost = 0;
  for (const c of pool) {
    totalCharge += c.chargeRatePerHour;
    totalCost += c.costRatePerHour;
  }

  if (totalCharge === 0) return 0.3;
  return Math.max(0.01, (totalCharge - totalCost) / totalCharge);
}

/**
 * Working days (Mon–Fri) remaining in the current month.
 *
 * - If today is a weekday it IS included in the count.
 * - If today is Sat/Sun it is NOT included (next weekday starts the count).
 * - Always returns at least 1 to prevent division-by-zero.
 *
 * @param now - A Date used to derive the London-local date.
 */
export function workingDaysLeftInMonth(now = new Date()): number {
  const { year, month, day } = toLondonDateParts(now);
  const lastDay = londonLastDayOfMonth(year, month);
  let count = 0;
  for (let d = day; d <= lastDay; d++) {
    const dow = londonDayOfWeek(year, month, d);
    if (dow !== 0 && dow !== 6) count++;
  }
  return Math.max(1, count);
}

// ─── Main computation ────────────────────────────────────────────────

export function computeBreakEven(
  overheads: OverheadRow[],
  rateCards: RateCardRow[],
  revenue: RevenueSnapshot,
  now = new Date(),
): BreakEvenResult {
  const monthlyOverheadPence = totalMonthlyOverheadPence(overheads);
  const avgMarginRatio = avgMarginFromRateCards(rateCards);

  // Revenue needed = overheads / margin
  const breakEvenRevenuePence =
    avgMarginRatio > 0
      ? Math.round(monthlyOverheadPence / avgMarginRatio)
      : monthlyOverheadPence; // edge case: no margin data

  const earnedPence = revenue.thisMonthPence;
  const remainingPence = breakEvenRevenuePence - earnedPence;
  const progressPercent =
    breakEvenRevenuePence > 0
      ? Math.round((earnedPence / breakEvenRevenuePence) * 100)
      : earnedPence > 0
        ? 100
        : 0;

  const daysLeft = workingDaysLeftInMonth(now);
  const requiredDailyPence =
    remainingPence > 0 ? Math.round(remainingPence / daysLeft) : 0;

  return {
    monthlyOverheadPence,
    avgMarginRatio,
    breakEvenRevenuePence,
    earnedPence,
    progressPercent,
    remainingPence,
    daysLeft,
    requiredDailyPence,
  };
}
