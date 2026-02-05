import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { checkOpsAuth, getOpsClientIp, opsRateLimitRead, redactSensitive } from "@/lib/server/opsAuth";
import { logCriticalAction } from "@/lib/server/observability";
import { uploadRoot, writeUploadBytes, readUploadBytes } from "@/lib/server/storage";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = checkOpsAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }
  const rl = opsRateLimitRead(req, "health");
  if (rl) return rl;

  const prisma = getPrisma();
  const start = Date.now();

  // 1. Database connectivity
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // db unreachable
  }

  // 2. Storage provider health check (write + read + cleanup a temp file)
  let storageOk = false;
  let storageError: string | null = null;
  try {
    const tempContent = Buffer.from(`health-check-${Date.now()}`);
    const tempKey = writeUploadBytes(tempContent, { ext: "tmp", prefix: "_ops-health" });
    const readBack = readUploadBytes(tempKey);
    storageOk = readBack !== null && readBack.equals(tempContent);
    // Cleanup: remove the temp file
    try {
      const full = path.join(uploadRoot(), tempKey);
      fs.unlinkSync(full);
    } catch {
      // cleanup best-effort
    }
  } catch (e: any) {
    storageError = e?.message ?? "storage_write_failed";
  }

  // 3. Key environment variable presence checks
  const envChecks: Record<string, boolean> = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    CRON_SECRET: !!process.env.CRON_SECRET,
    QT_CRON_SECRET: !!process.env.QT_CRON_SECRET,
    OPS_SECRET: !!process.env.OPS_SECRET,
  };

  const allEnvPresent = Object.values(envChecks).every(Boolean);

  const result = {
    ok: dbOk && storageOk,
    database: dbOk ? "connected" : "unreachable",
    storage: storageOk ? "ok" : storageError ?? "failed",
    envVars: { present: envChecks, allPresent: allEnvPresent },
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    checkDurationMs: Date.now() - start,
  };

  // Log to OpsAuditLog
  try {
    await prisma.opsAuditLog.create({
      data: {
        action: "health_check",
        result: result as any,
        ipAddress: getOpsClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
  } catch {
    // best-effort logging
  }

  logCriticalAction({ name: "ops.health_check", metadata: { dbOk, storageOk, allEnvPresent } });

  return NextResponse.json(result, { status: dbOk ? 200 : 503 });
}
