/**
 * Production-Ready Rate Limiting with Redis Support
 *
 * This module provides rate limiting that scales across multiple instances:
 * - Uses Redis when REDIS_URL is configured (required for production on Render)
 * - Falls back to in-memory store for local development
 *
 * Environment Variables:
 * - REDIS_URL: Redis connection string (e.g., redis://user:pass@host:port)
 * - REDIS_TLS: Set to "1" to enable TLS for Redis connection
 *
 * @example
 * ```ts
 * import { rateLimit } from "@/lib/rateLimit";
 *
 * const result = rateLimit({ key: "login:user@example.com", limit: 5, windowMs: 900000 });
 * if (!result.ok) {
 *   return res.status(429).json({ error: "Too many requests" });
 * }
 * ```
 */

// ============================================================================
// Configuration
// ============================================================================

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const REDIS_URL = process.env.REDIS_URL;

// Conservative limits when Redis is unavailable in production
const FALLBACK_LIMIT_MULTIPLIER = 0.5; // 50% of normal limits
let warnedAboutMissingRedis = false;

// ============================================================================
// Redis Client (Lazy Singleton)
// ============================================================================

type RedisClientType = {
  isOpen: boolean;
  connect: () => Promise<void>;
  quit: () => Promise<void>;
  multi: () => {
    zRemRangeByScore: (key: string, min: number, max: number) => unknown;
    zAdd: (key: string, member: { score: number; value: string }) => unknown;
    zCard: (key: string) => unknown;
    expire: (key: string, seconds: number) => unknown;
    exec: () => Promise<unknown[]>;
  };
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};

let redisClient: RedisClientType | null = null;
let redisConnected = false;
let redisConnectionPromise: Promise<void> | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  if (!REDIS_URL) {
    if (IS_PRODUCTION && !warnedAboutMissingRedis) {
      warnedAboutMissingRedis = true;
      console.warn(
        "[SECURITY WARNING] REDIS_URL is not configured in production. " +
          "Rate limiting will use in-memory storage which does NOT scale across instances. " +
          "This is a security risk - attackers can bypass rate limits by hitting different instances. " +
          "Configure REDIS_URL for proper distributed rate limiting."
      );
    }
    return null;
  }

  if (redisClient && redisConnected) {
    return redisClient;
  }

  if (redisConnectionPromise) {
    await redisConnectionPromise;
    return redisClient;
  }

  redisConnectionPromise = (async () => {
    try {
      // Dynamic import to avoid bundling redis in environments that don't need it
      const { createClient } = await import("redis");

      const options: { url: string; socket?: { tls: boolean; rejectUnauthorized: boolean } } = {
        url: REDIS_URL,
      };

      if (process.env.REDIS_TLS === "1") {
        options.socket = { tls: true, rejectUnauthorized: false };
      }

      redisClient = createClient(options) as unknown as RedisClientType;

      redisClient.on("error", (err: unknown) => {
        console.error("[rateLimit] Redis error:", err);
        redisConnected = false;
      });

      redisClient.on("connect", () => {
        console.log("[rateLimit] Redis connected");
        redisConnected = true;
      });

      redisClient.on("reconnecting", () => {
        console.log("[rateLimit] Redis reconnecting...");
      });

      await redisClient.connect();
      redisConnected = true;
    } catch (err) {
      console.error("[rateLimit] Failed to connect to Redis:", err);
      redisClient = null;
      redisConnected = false;
    }
  })();

  await redisConnectionPromise;
  return redisClient;
}

// ============================================================================
// In-Memory Fallback Store
// ============================================================================

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Periodic cleanup of expired buckets (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, bucket] of buckets.entries()) {
        if (now > bucket.resetAt) {
          buckets.delete(key);
        }
      }
    },
    5 * 60 * 1000
  );
}

function inMemoryRateLimit(opts: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const b = buckets.get(opts.key);

  if (!b || now > b.resetAt) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, resetAt: now + opts.windowMs };
  }

  b.count += 1;
  if (b.count > opts.limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }

  return { ok: true, remaining: opts.limit - b.count, resetAt: b.resetAt };
}

// ============================================================================
// Redis Rate Limit (Sliding Window)
// ============================================================================

async function redisRateLimit(
  client: RedisClientType,
  opts: { key: string; limit: number; windowMs: number }
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - opts.windowMs;
  const redisKey = `ratelimit:${opts.key}`;

  try {
    // Use sorted set for sliding window rate limiting
    // Remove expired entries, add current request, count remaining
    const multi = client.multi();
    multi.zRemRangeByScore(redisKey, 0, windowStart);
    multi.zAdd(redisKey, { score: now, value: `${now}:${Math.random()}` });
    multi.zCard(redisKey);
    multi.expire(redisKey, Math.ceil(opts.windowMs / 1000) + 1);

    const results = await multi.exec();
    const count = (results?.[2] as number) || 0;

    const remaining = Math.max(0, opts.limit - count);
    const resetAt = now + opts.windowMs;

    return {
      ok: count <= opts.limit,
      remaining,
      resetAt,
    };
  } catch (err) {
    console.error("[rateLimit] Redis operation failed, falling back to in-memory:", err);
    return inMemoryRateLimit(opts);
  }
}

// ============================================================================
// Main Rate Limit Function (Synchronous for compatibility)
// ============================================================================

/**
 * Synchronous rate limiting - uses in-memory store for immediate response.
 * In production with Redis, this also syncs to Redis asynchronously.
 */
export function rateLimit(opts: { key: string; limit: number; windowMs: number }): {
  ok: boolean;
  remaining: number;
  resetAt: number;
} {
  // Apply conservative limits in production when Redis is unavailable
  const effectiveLimit =
    IS_PRODUCTION && !REDIS_URL ? Math.ceil(opts.limit * FALLBACK_LIMIT_MULTIPLIER) : opts.limit;

  // Synchronous check using in-memory (for immediate response)
  const result = inMemoryRateLimit({ ...opts, limit: effectiveLimit });

  // Fire-and-forget Redis sync (don't block the response)
  if (REDIS_URL) {
    getRedisClient()
      .then((client) => {
        if (client) {
          redisRateLimit(client, opts).catch(() => {});
        }
      })
      .catch(() => {});
  }

  return result;
}

/**
 * Async rate limit check - use when you need accurate distributed counts.
 * Waits for Redis response if available.
 */
export async function rateLimitAsync(opts: { key: string; limit: number; windowMs: number }): Promise<{
  ok: boolean;
  remaining: number;
  resetAt: number;
}> {
  const client = await getRedisClient();

  if (client) {
    return redisRateLimit(client, opts);
  }

  // Apply conservative limits in production when Redis is unavailable
  const effectiveLimit = IS_PRODUCTION ? Math.ceil(opts.limit * FALLBACK_LIMIT_MULTIPLIER) : opts.limit;

  return inMemoryRateLimit({ ...opts, limit: effectiveLimit });
}
