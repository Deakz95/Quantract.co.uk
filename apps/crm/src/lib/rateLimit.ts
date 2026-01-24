type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(opts: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const b = buckets.get(opts.key);
  if (!b || now > b.resetAt) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, resetAt: now + opts.windowMs };
  }
  b.count += 1;
  if (b.count > opts.limit) return { ok: false, remaining: 0, resetAt: b.resetAt };
  return { ok: true, remaining: opts.limit - b.count, resetAt: b.resetAt };
}
