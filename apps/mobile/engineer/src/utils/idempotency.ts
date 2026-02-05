/**
 * Generates a unique idempotency key for outbox operations.
 * Format: {prefix}_{timestamp}_{random}
 * Prefix helps identify the operation type in logs/debugging.
 */
export function makeIdempotencyKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
