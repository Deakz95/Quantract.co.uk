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

    const [usage, company] = await Promise.all([
      prisma.companyStorageUsage.findUnique({
        where: { companyId: authCtx.companyId },
        select: { bytesUsed: true },
      }),
      prisma.company.findUnique({
        where: { id: authCtx.companyId },
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

    return NextResponse.json({
      ok: true,
      bytesUsed,
      bytesLimit: bytesLimit === Infinity ? null : bytesLimit,
      percentUsed,
      plan: billing?.plan || company.plan,
      canUpgrade: (billing?.plan || company.plan) !== "enterprise",
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    console.error("[GET /api/storage/usage]", error);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
