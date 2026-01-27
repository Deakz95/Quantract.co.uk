#!/usr/bin/env node
/**
 * fix-migrations.mjs
 *
 * Marks all migrations as applied without running them.
 * Use this when the database schema exists but Prisma's migration
 * history is out of sync (database drift).
 *
 * Usage:
 *   node scripts/with-neon-conn.mjs -- node scripts/fix-migrations.mjs
 */

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

async function getMigrations() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && /^\d{14}_/.test(e.name))
    .map((e) => e.name)
    .sort();
}

async function runPrismaResolve(migrationName) {
  return new Promise((resolve, reject) => {
    console.log(`[fix-migrations] Marking as applied: ${migrationName}`);

    const child = spawn("npx", ["prisma", "migrate", "resolve", "--applied", migrationName], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        // Non-zero exit might mean already applied, continue anyway
        console.log(`[fix-migrations] Warning: exit code ${code} for ${migrationName}`);
        resolve();
      }
    });
  });
}

async function main() {
  console.log("[fix-migrations] Finding migrations to mark as applied...");

  const migrations = await getMigrations();
  console.log(`[fix-migrations] Found ${migrations.length} migrations`);

  for (const migration of migrations) {
    await runPrismaResolve(migration);
  }

  console.log("[fix-migrations] Done! Now run: npx prisma migrate deploy");
}

main().catch((err) => {
  console.error("[fix-migrations] Error:", err.message);
  process.exit(1);
});
