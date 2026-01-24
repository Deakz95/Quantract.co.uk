/**
 * Shared utility functions for Quantract applications.
 */

/**
 * Combine class names conditionally (Tailwind-friendly).
 * Usage: cn("base", condition && "conditional", "always")
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format a date to locale string.
 */
export function formatDate(date: Date | string, locale = "en-GB"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a date to ISO string.
 */
export function formatDateISO(date: Date): string {
  return date.toISOString();
}

/**
 * Format currency (GBP by default).
 */
export function formatCurrency(
  amount: number,
  currency = "GBP",
  locale = "en-GB"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Format currency from pence/cents to pounds/dollars.
 */
export function formatCurrencyFromMinor(
  amountInMinor: number,
  currency = "GBP",
  locale = "en-GB"
): string {
  return formatCurrency(amountInMinor / 100, currency, locale);
}

/**
 * Generate a unique ID.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
