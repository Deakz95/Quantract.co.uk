/**
 * Idempotency-Key support for API routes.
 *
 * In production with REDIS_URL, uses Redis with TTL.
 * In development, falls back to an in-memory Map (process-scoped, cleared on restart).
 *
 * Keys are scoped by companyId + userId + route to prevent cross-tenant collisions.
 */

const IDEMPOTENCY_TTL_SECONDS = 60 * 60; // 1 hour (shorter than 24h per reviewer suggestion)

// ---------------------------------------------------------------------------
// In-memory fallback (dev only)
// ---------------------------------------------------------------------------
const memStore = new Map<string, { response: string; expiresAt: number }>();

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return null;
  }
  return entry.response;
}

function memSet(key: string, value: string): void {
  memStore.set(key, { response: value, expiresAt: Date.now() + IDEMPOTENCY_TTL_SECONDS * 1000 });
  // Lazy cleanup: cap size at 10k entries
  if (memStore.size > 10_000) {
    const now = Date.now();
    for (const [k, v] of memStore) {
      if (now > v.expiresAt) memStore.delete(k);
    }
  }
}

// ---------------------------------------------------------------------------
// Redis helpers (lazy import to avoid startup errors when Redis isn't available)
// ---------------------------------------------------------------------------
let redisClient: any = null;
let redisChecked = false;

async function getRedis(): Promise<any> {
  if (redisChecked) return redisClient;
  redisChecked = true;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const { createClient } = await import("redis");
    redisClient = createClient({ url });
    redisClient.on("error", () => {
      // Silently degrade to in-memory on connection errors
      redisClient = null;
    });
    await redisClient.connect();
  } catch {
    redisClient = null;
  }
  return redisClient;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a scoped idempotency key from the raw header value.
 * Scoped by companyId + userId + route to prevent cross-tenant collisions.
 */
export function scopedKey(
  rawKey: string,
  companyId: string,
  userId: string,
  route: string,
): string {
  return `idem:${companyId}:${userId}:${route}:${rawKey}`;
}

/**
 * Look up a previously stored response for an idempotency key.
 * Returns the parsed JSON body or null if not found / expired.
 */
export async function getIdempotentResponse(key: string): Promise<any | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      // Fall through to memory
    }
  }
  const val = memGet(key);
  return val ? JSON.parse(val) : null;
}

/**
 * Store a response body against an idempotency key.
 */
export async function setIdempotentResponse(key: string, body: any): Promise<void> {
  const serialized = JSON.stringify(body);
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(key, serialized, { EX: IDEMPOTENCY_TTL_SECONDS });
      return;
    } catch {
      // Fall through to memory
    }
  }
  memSet(key, serialized);
}
