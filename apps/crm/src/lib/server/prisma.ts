import { PrismaClient } from "@prisma/client";
import { assertEnv } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Production-safe Prisma singleton.
 *
 * Note: We intentionally *do not* return null here. If DATABASE_URL is missing,
 * we fail fast so API routes that rely on Prisma don't compile into a broken runtime.
 */
function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (url == null || url.trim() === "") {
    throw new Error("DATABASE_URL is missing. Set DATABASE_URL in your environment (.env/.env.local). ");
  }

  if (global.__prisma) return global.__prisma;

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") global.__prisma = client;
  return client;
}

// Most of the codebase expects `prisma.<model>`.
export const prisma = createPrismaClient();

// Some routes used to call prisma() - keep a helper for that pattern.
export function getPrisma() {
  return prisma;
}
// Back-compat helper used by some API routes
export const p = getPrisma;
