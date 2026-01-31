/**
 * TEMP performance timing helpers, gated by PERF_LOGS=1.
 * Safe for production; easy to remove later.
 */

export function perfEnabled(): boolean {
  return process.env.PERF_LOGS === "1";
}

/**
 * Start a timer. Returns a function that when called returns elapsed ms.
 */
export function timeStart(_label: string): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}

/**
 * Log a single-line structured perf entry if PERF_LOGS=1.
 * Values must be JSON-serializable. No PII.
 */
export function logPerf(label: string, data: Record<string, unknown>): void {
  if (!perfEnabled()) return;
  console.info(`[perf] ${label}`, JSON.stringify(data));
}
