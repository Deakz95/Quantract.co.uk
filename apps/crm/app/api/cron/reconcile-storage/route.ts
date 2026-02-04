import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { log } from "@/lib/server/logger";

export const runtime = "nodejs";

/**
 * POST /api/cron/reconcile-storage
 *
 * Recomputes CompanyStorageUsage.bytesUsed from the Document table for all companies.
 * Also handles companies with zero documents (sets bytesUsed=0) so deleted files are reflected.
 * Idempotent by design — safe to run on any schedule.
 *
 * Auth: Bearer token via CRON_SECRET environment variable.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
  }

  try {
    let companiesReconciled = 0;
    let driftDetected = 0;

    // 1. Aggregate actual usage from Document table grouped by company
    const actualUsage: Array<{ companyId: string; totalBytes: bigint }> = await prisma.$queryRaw`
      SELECT "companyId", COALESCE(SUM("sizeBytes"), 0)::BIGINT AS "totalBytes"
      FROM "Document"
      GROUP BY "companyId"
    `;

    const actualByCompany = new Map(actualUsage.map((r: { companyId: string; totalBytes: bigint }) => [r.companyId, r.totalBytes]));

    // 2. Get all existing storage usage records
    const existingRecords = await prisma.companyStorageUsage.findMany({
      select: { companyId: true, bytesUsed: true },
    });

    // 3. Reconcile each company that has documents or an existing usage record
    const allCompanyIds = new Set([
      ...actualByCompany.keys(),
      ...existingRecords.map((r: { companyId: string }) => r.companyId),
    ]);

    for (const companyId of allCompanyIds) {
      const actual = actualByCompany.get(companyId) ?? BigInt(0);
      const existing = existingRecords.find((r: { companyId: string; bytesUsed: bigint }) => r.companyId === companyId);
      const recorded = existing?.bytesUsed ?? BigInt(-1); // -1 means no record exists

      if (recorded !== actual) {
        await prisma.companyStorageUsage.upsert({
          where: { companyId },
          create: { companyId, bytesUsed: actual },
          update: { bytesUsed: actual },
        });

        if (recorded !== BigInt(-1)) {
          const driftBytes = Number(actual) - Number(recorded);
          log.warn("cron/reconcile-storage", {
            companyId,
            recorded: Number(recorded),
            actual: Number(actual),
            driftBytes,
          });
          driftDetected++;
        }
        companiesReconciled++;
      }
    }

    log.info("cron/reconcile-storage", { companiesReconciled, driftDetected });
    return NextResponse.json({ ok: true, companiesReconciled, driftDetected });
  } catch (e: any) {
    log.error("cron/reconcile-storage", { error: e?.message });
    return NextResponse.json({ ok: false, error: "cron_failed" }, { status: 500 });
  }
}
