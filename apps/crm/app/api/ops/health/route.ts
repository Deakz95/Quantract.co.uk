import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { checkOpsAuth, getOpsClientIp, redactSensitive } from "@/lib/server/opsAuth";
import { logCriticalAction } from "@/lib/server/observability";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = checkOpsAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const prisma = getPrisma();
  const start = Date.now();

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // db unreachable
  }

  const result = {
    ok: dbOk,
    database: dbOk ? "connected" : "unreachable",
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

  logCriticalAction({ name: "ops.health_check", metadata: { dbOk } });

  return NextResponse.json(result, { status: dbOk ? 200 : 503 });
}
