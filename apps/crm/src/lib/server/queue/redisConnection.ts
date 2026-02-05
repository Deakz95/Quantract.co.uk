import "server-only";
import IORedis from "ioredis";

/**
 * Redis Connection Helper for BullMQ
 *
 * Creates Redis connection with proper configuration for BullMQ.
 * Connection is reused across queue instances.
 */

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export function createRedisConnection(): IORedis {
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  });

  return connection;
}
