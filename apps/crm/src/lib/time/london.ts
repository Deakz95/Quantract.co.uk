/**
 * Timezone helpers for Europe/London.
 *
 * Uses built-in Intl.DateTimeFormat — no external deps.
 * All break-even and month-boundary logic should use these helpers
 * so that "today" and "this month" are consistent with UK business time.
 */

const TZ = "Europe/London";

/**
 * Extract { year, month (1-based), day } in Europe/London for the given instant.
 */
export function toLondonDateParts(date: Date): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const day = Number(parts.find((p) => p.type === "day")!.value);
  return { year, month, day };
}

/**
 * Return the UTC instant that corresponds to midnight on the 1st of the
 * London-local month containing `date`.
 */
export function startOfLondonMonth(date: Date): Date {
  const { year, month } = toLondonDateParts(date);
  // Build an ISO string at midnight London time and resolve to UTC
  // by constructing via the known offset.
  return londonMidnight(year, month, 1);
}

/**
 * Return the UTC instant that corresponds to midnight on the 1st of the
 * NEXT London-local month after `date`.
 */
export function endOfLondonMonth(date: Date): Date {
  const { year, month } = toLondonDateParts(date);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return londonMidnight(nextYear, nextMonth, 1);
}

/**
 * Return a Date representing "today" in Europe/London (midnight London time).
 */
export function londonToday(): Date {
  const { year, month, day } = toLondonDateParts(new Date());
  return londonMidnight(year, month, day);
}

/**
 * Get the London-local day-of-month for the given instant.
 */
export function londonDayOfMonth(date: Date): number {
  return toLondonDateParts(date).day;
}

/**
 * Get the London-local day-of-week (0=Sun, 6=Sat) for a given
 * year/month/day in London.
 */
export function londonDayOfWeek(year: number, month: number, day: number): number {
  return londonMidnight(year, month, day).getUTCDay();
}

/**
 * Last day of month for a given London year/month.
 */
export function londonLastDayOfMonth(year: number, month: number): number {
  // day=0 of next month gives last day of current month
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return new Date(Date.UTC(nextYear, nextMonth - 1, 0)).getUTCDate();
}

// ─── Internal ───────────────────────────────────────────────────────

/**
 * Build a UTC Date that represents midnight in London on the given date.
 * Accounts for BST/GMT by using a heuristic: construct at noon UTC,
 * check the London date, and adjust.
 */
function londonMidnight(year: number, month: number, day: number): Date {
  // Start with a rough noon-UTC guess — London is never more than ±1h from UTC
  const guess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  // Determine actual London offset by formatting
  const londonStr = guess.toLocaleString("en-GB", { timeZone: TZ, hour12: false });
  // londonStr is like "31/01/2026, 12:00:00" or "31/07/2026, 13:00:00"
  const londonHour = Number(londonStr.split(",")[1].trim().split(":")[0]);
  const offsetHours = londonHour - 12; // +1 during BST, 0 during GMT
  // Midnight London = midnight UTC minus the offset
  return new Date(Date.UTC(year, month - 1, day, -offsetHours, 0, 0));
}
