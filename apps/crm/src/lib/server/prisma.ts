import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Production-safe Prisma singleton with lazy initialization.
 *
 * The client is created lazily (on first use) to support builds where
 * DATABASE_URL is not available. This allows Next.js page data collection
 * to complete during build without a database connection.
 *
 * At runtime, DATABASE_URL is injected by the with-neon-conn.mjs wrapper
 * before the app starts.
 */
function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (url == null || url.trim() === "") {
    throw new Error(
      "DATABASE_URL is missing. " +
      "In production, this should be injected by with-neon-conn.mjs at runtime. " +
      "For local dev, set DATABASE_URL in .env.local."
    );
  }

  if (global.__prisma) return global.__prisma;

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") global.__prisma = client;
  return client;
}

/**
 * Lazy Prisma client getter - only initializes on first call.
 * This is the primary way to access the Prisma client.
 */
export function getPrisma(): PrismaClient {
  // Lazy initialization - only create client when actually needed
  if (!global.__prisma) {
    global.__prisma = createPrismaClient();
  }
  return global.__prisma;
}

/**
 * Proxy object that lazily initializes PrismaClient on first property access.
 * This allows `import { prisma } from './prisma'` to work at module load time
 * without actually connecting to the database until a query is made.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return getPrisma()[prop as keyof PrismaClient];
  },
});

// Back-compat helper used by some API routes
export const p = getPrisma;
