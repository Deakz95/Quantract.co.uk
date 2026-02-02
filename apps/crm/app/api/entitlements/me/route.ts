import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import {
  normalizePlan,
  getPlanDefinition,
  getTrialStatus,
  hasEntitlement,
  getLimit,
  type OrgEntitlements,
  type Module,
  type EntitlementKey,
} from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * GET /api/entitlements/me
 *
 * Returns the current company's entitlements and feature flags.
 * Available to any authenticated user (all roles).
 * Intentionally lean — no usage counts or admin-level detail.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const companyId = authCtx.companyId;
    const userEmail = authCtx.email;

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const company = await client.company.findUnique({
      where: { id: companyId },
      select: {
        plan: true,
        trialStartedAt: true,
        subscriptionStatus: true,
      },
    });

    if (!company) {
      return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 404 });
    }

    const planTier = normalizePlan(company.plan);
    const planDef = getPlanDefinition(company.plan, userEmail);
    const enabledModules: Module[] = [...planDef.limits.includedModules];

    const entitlements: OrgEntitlements = {
      plan: planTier,
      enabledModules,
      extraUsers: 0,
      extraEntities: 0,
      extraStorageMB: 0,
    };

    const trial = getTrialStatus(company.plan, company.trialStartedAt, userEmail);

    const featureKeys: EntitlementKey[] = [
      "module_crm",
      "module_certificates",
      "module_portal",
      "module_tools",
      "feature_schedule",
      "feature_timesheets",
      "feature_xero",
      "feature_subdomain",
      "feature_dedicated_db",
    ];

    const features: Record<string, boolean> = {};
    for (const key of featureKeys) {
      features[key] = hasEntitlement(entitlements, key, userEmail);
    }

    const limits: Record<string, number | boolean> = {};
    const limitKeys: EntitlementKey[] = [
      "users",
      "legal_entities",
      "invoices_per_month",
      "certificates_per_month",
      "quotes_per_month",
      "storage_mb",
    ];
    for (const key of limitKeys) {
      limits[key] = getLimit(entitlements, key, userEmail);
    }

    return NextResponse.json({
      ok: true,
      plan: planTier,
      planLabel: planDef.label,
      subscriptionStatus: company.subscriptionStatus,
      trial: {
        active: trial.isTrialPlan,
        expired: trial.isExpired,
        daysRemaining: trial.daysRemaining,
      },
      features,
      limits,
    });
  } catch (error) {
    logError(error, { route: "/api/entitlements/me", action: "get" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
