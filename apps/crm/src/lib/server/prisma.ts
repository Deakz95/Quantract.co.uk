import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

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

  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // Auto-populate id and updatedAt on create, updatedAt on update.
  // The schema uses String @id without @default and DateTime updatedAt
  // without @updatedAt, so the application must supply these values.
  // Uses $extends (Prisma 5+/6+ replacement for removed $use middleware).
  const client = base.$extends({
    query: {
      $allModels: {
        async create({ args, query }: any) {
          if (args.data) {
            if (!args.data.id) args.data.id = crypto.randomUUID();
            if (args.data.updatedAt === undefined) args.data.updatedAt = new Date();
          }
          return query(args);
        },
        async createMany({ args, query }: any) {
          if (Array.isArray(args.data)) {
            for (const row of args.data) {
              if (!row.id) row.id = crypto.randomUUID();
              if (row.updatedAt === undefined) row.updatedAt = new Date();
            }
          }
          return query(args);
        },
        async update({ args, query }: any) {
          if (args.data && args.data.updatedAt === undefined) {
            args.data.updatedAt = new Date();
          }
          return query(args);
        },
        async updateMany({ args, query }: any) {
          if (args.data && args.data.updatedAt === undefined) {
            args.data.updatedAt = new Date();
          }
          return query(args);
        },
        async upsert({ args, query }: any) {
          if (args.create) {
            if (!args.create.id) args.create.id = crypto.randomUUID();
            if (args.create.updatedAt === undefined) args.create.updatedAt = new Date();
          }
          if (args.update && args.update.updatedAt === undefined) {
            args.update.updatedAt = new Date();
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;

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
