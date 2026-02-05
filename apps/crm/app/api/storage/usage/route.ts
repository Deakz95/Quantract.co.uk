import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { computeEntitlements } from "@/lib/entitlements";
import { type Module } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * GET /api/storage/usage
 *
 * Returns current storage usage, limit, and plan info for the company.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const cid = authCtx.companyId;

    const [usage, company, breakdown] = await Promise.all([
      prisma.companyStorageUsage.findUnique({
        where: { companyId: cid },
        select: { bytesUsed: true },
      }),
      prisma.company.findUnique({
        where: { id: cid },
        select: {
          plan: true,
          billing: {
            select: {
              plan: true,
              enabledModules: true,
              extraStorageMB: true,
            },
          },
        },
      }),
      // Per-type breakdown (only active documents)
      prisma.$queryRaw<Array<{ type: string; count: bigint; totalBytes: bigint }>>`
        SELECT "type", COUNT(*)::BIGINT AS "count", COALESCE(SUM("sizeBytes"), 0)::BIGINT AS "totalBytes"
        FROM "Document"
        WHERE "companyId" = ${cid} AND "deletedAt" IS NULL
        GROUP BY "type"
        ORDER BY "totalBytes" DESC
      `,
    ]);

    if (!company) {
      return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 404 });
    }

    const billing = company.billing;
    const entitlements = computeEntitlements(billing?.plan || company.plan, {
      enabledModules: (billing?.enabledModules as Module[]) || [],
      extraStorageMB: billing?.extraStorageMB || 0,
    });

    const bytesUsed = Number(usage?.bytesUsed ?? 0);
    const limitMb = entitlements.limit_storage_mb as number;
    const bytesLimit = limitMb === Infinity ? Infinity : limitMb * 1024 * 1024;
    const percentUsed = bytesLimit === Infinity ? 0 : Math.min(100, Math.round((bytesUsed / bytesLimit) * 100));

    // Compute warning level for client-side messaging
    let warningLevel: string | null = null;
    if (bytesLimit !== Infinity) {
      if (percentUsed >= 100) warningLevel = "blocked_100";
      else if (percentUsed >= 90) warningLevel = "warning_90";
      else if (percentUsed >= 80) warningLevel = "warning_80";
    }

    return NextResponse.json({
      ok: true,
      bytesUsed,
      bytesLimit: bytesLimit === Infinity ? null : bytesLimit,
      percentUsed,
      warningLevel,
      plan: billing?.plan || company.plan,
      canUpgrade: (billing?.plan || company.plan) !== "enterprise",
      breakdown: breakdown.map((r: { type: string; count: bigint; totalBytes: bigint }) => ({
        type: r.type,
        count: Number(r.count),
        totalBytes: Number(r.totalBytes),
      })),
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    console.error("[GET /api/storage/usage]", error);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
