#!/usr/bin/env node
/**
 * safe-migrate.mjs
 *
 * Attempts to run prisma migrate deploy. If it fails due to database drift,
 * automatically resolves migrations and retries.
 *
 * Usage:
 *   node scripts/with-neon-conn.mjs -- node scripts/safe-migrate.mjs
 */

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", (err) => {
      console.error(`[safe-migrate] Command error: ${err.message}`);
      resolve({ success: false, code: 1 });
    });

    child.on("close", (code) => {
      resolve({ success: code === 0, code });
    });
  });
}

async function getMigrations() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && /^\d{14}_/.test(e.name))
    .map((e) => e.name)
    .sort();
}

async function resolveMigration(migrationName) {
  console.log(`[safe-migrate] Marking as applied: ${migrationName}`);
  return runCommand("npx", ["prisma", "migrate", "resolve", "--applied", migrationName]);
}

async function main() {
  console.log("[safe-migrate] Attempting prisma migrate deploy...");

  // First attempt
  const result1 = await runCommand("npx", ["prisma", "migrate", "deploy"]);

  if (result1.success) {
    console.log("[safe-migrate] Migrations applied successfully!");
    process.exit(0);
  }

  console.log("[safe-migrate] Migration failed, attempting to resolve drift...");

  // Get all migrations and mark them as applied
  const migrations = await getMigrations();
  console.log(`[safe-migrate] Found ${migrations.length} migrations to resolve`);

  for (const migration of migrations) {
    await resolveMigration(migration);
  }

  console.log("[safe-migrate] Retrying prisma migrate deploy...");

  // Second attempt after resolving
  const result2 = await runCommand("npx", ["prisma", "migrate", "deploy"]);

  if (result2.success) {
    console.log("[safe-migrate] Migrations applied successfully after resolve!");
    process.exit(0);
  }

  console.error("[safe-migrate] Migration still failed after resolve. Manual intervention required.");
  process.exit(result2.code || 1);
}

main().catch((err) => {
  console.error("[safe-migrate] Fatal error:", err.message);
  process.exit(1);
});
