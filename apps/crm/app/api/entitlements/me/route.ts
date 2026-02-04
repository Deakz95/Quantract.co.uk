import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { computeEntitlements, type Entitlements } from "@/lib/entitlements";
import { type Module } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * GET /api/entitlements/me
 *
 * Returns entitlements for the current user's company.
 * Available to any authenticated user (admin, office, engineer, client).
 * Supports both cookie-based auth (CRM web) and Bearer token auth (mobile apps).
 * This is THE canonical endpoint for all apps to fetch entitlements.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireAuth();

    const companyId = authCtx.companyId;
    if (!companyId) {
      // User exists but has no company — return trial entitlements
      const entitlements = computeEntitlements("trial");
      return NextResponse.json({
        ok: true,
        entitlements,
        company: null,
      });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    // Fetch company with billing relation
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        trialStartedAt: true,
        trialEnd: true,
        billing: {
          select: {
            plan: true,
            subscriptionStatus: true,
            enabledModules: true,
            extraUsers: true,
            extraEntities: true,
            extraStorageMB: true,
            trialStartedAt: true,
            cancelAtPeriodEnd: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 404 });
    }

    // Fetch active entitlement overrides for this company
    const activeOverrides = await prisma.entitlementOverride.findMany({
      where: {
        companyId,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { key: true, value: true },
    }).catch(() => [] as { key: string; value: string }[]);

    // Use billing table if exists, fallback to company fields
    const billing = company.billing;
    const entitlements = computeEntitlements(billing?.plan || company.plan, {
      overrideEmail: authCtx.email,
      enabledModules: (billing?.enabledModules as Module[]) || [],
      extraUsers: billing?.extraUsers || 0,
      extraEntities: billing?.extraEntities || 0,
      extraStorageMB: billing?.extraStorageMB || 0,
      trialStartedAt: billing?.trialStartedAt || company.trialStartedAt,
      adminOverrides: activeOverrides,
    });

    return NextResponse.json({
      ok: true,
      entitlements,
      company: {
        id: company.id,
        name: company.name,
        plan: billing?.plan || company.plan,
        subscriptionStatus: billing?.subscriptionStatus || company.subscriptionStatus,
        cancelAtPeriodEnd: billing?.cancelAtPeriodEnd || false,
      },
      modules: billing?.enabledModules || [],
      addOns: {
        extraUsers: billing?.extraUsers || 0,
        extraEntities: billing?.extraEntities || 0,
        extraStorageMB: billing?.extraStorageMB || 0,
      },
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    console.error("[GET /api/entitlements/me]", error);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
