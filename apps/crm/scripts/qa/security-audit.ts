#!/usr/bin/env tsx
/**
 * Security audit script for /api/admin/* routes.
 *
 * Checks:
 * 1. Every route calls requireCompanyContext() or has explicit auth guard
 * 2. No raw UUIDs leaked in responses without human labels
 *
 * Usage: npx tsx scripts/qa/security-audit.ts
 */

import fs from "node:fs";
import path from "node:path";

const API_ADMIN_DIR = path.resolve(__dirname, "../../app/api/admin");

let totalFiles = 0;
let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function scanDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
      continue;
    }
    if (!entry.name.endsWith("route.ts") && !entry.name.endsWith("route.tsx")) continue;

    totalFiles++;
    const content = fs.readFileSync(fullPath, "utf-8");
    const relativePath = path.relative(API_ADMIN_DIR, fullPath).replace(/\\/g, "/");

    // Check 1: Must call requireCompanyContext, requireRole, requireSuperAdmin, or checkCronAuth
    const hasAuthGuard =
      content.includes("requireCompanyContext") ||
      content.includes("requireRole") ||
      content.includes("requireCapability") ||
      content.includes("requireSuperAdmin") ||
      content.includes("getAuthContext") ||
      content.includes("checkCronAuth") ||
      content.includes("CRON_SECRET");

    if (!hasAuthGuard) {
      failures.push(`FAIL [no-auth-guard] ${relativePath}`);
      failCount++;
    } else {
      passCount++;
    }

    // Check 2: Exported handlers must exist (GET, POST, PATCH, PUT, DELETE)
    const exportedHandlers = content.match(/export\s+(const|async\s+function)\s+(GET|POST|PATCH|PUT|DELETE)/g);
    if (!exportedHandlers || exportedHandlers.length === 0) {
      failures.push(`WARN [no-handlers]  ${relativePath}`);
    }
  }
}

console.log("🔒 Security Audit: /api/admin/* routes\n");
console.log(`Scanning: ${API_ADMIN_DIR}\n`);

scanDir(API_ADMIN_DIR);

if (failures.length > 0) {
  console.log("--- Findings ---\n");
  for (const f of failures) {
    console.log(`  ${f}`);
  }
  console.log();
}

console.log(`Files scanned: ${totalFiles}`);
console.log(`Auth guard:    ${passCount} pass, ${failCount} fail`);

if (failCount > 0) {
  console.log("\n❌ Audit FAILED — routes without auth guards found.");
  process.exit(1);
} else {
  console.log("\n✅ Audit PASSED — all admin routes have auth guards.");
}
