import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {
  normalizePlan,
  getPlanDefinition,
  getTrialStatus,
  getUsageStatus,
  getLimit,
  hasEntitlement,
  needsEnterprise,
  MODULE_PRICING,
  type OrgEntitlements,
  type Module,
  type PlanTier,
} from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * GET /api/admin/entitlements
 * Get current organization's entitlements and usage for the admin debugging page.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 401 });
    }

    const companyId = authCtx.companyId;
    const userEmail = authCtx.email;
    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

  // Get company data
  const company = await client.company.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      trialStartedAt: true,
      trialEnd: true,
      subscriptionStatus: true,
      quotesThisMonth: true,
      invoicesThisMonth: true,
      usageResetAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!company) {
    return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 404 });
  }

  // Count users
  const usersCount = await client.companyUser.count({
    where: { companyId, isActive: true },
  });

  // Count legal entities
  const entitiesCount = await client.legalEntity.count({
    where: { companyId, status: "active" },
  });

  // Count certificates this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const certificatesThisMonth = await client.certificate.count({
    where: {
      companyId,
      createdAt: { gte: startOfMonth },
    },
  });

  // Build entitlements object
  // For now, we assume no purchased modules/add-ons beyond the plan
  // In production, this would come from a billing/subscriptions table
  const planTier = normalizePlan(company.plan);
  const planDef = getPlanDefinition(company.plan, userEmail);

  // Determine enabled modules (from plan or would be from subscription)
  const enabledModules: Module[] = [...planDef.limits.includedModules];

  const entitlements: OrgEntitlements = {
    plan: planTier,
    enabledModules,
    extraUsers: 0, // Would come from purchased add-ons
    extraEntities: 0,
    extraStorageMB: 0,
  };

  // Get trial status
  const trialStatus = getTrialStatus(company.plan, company.trialStartedAt, userEmail);

  // Get usage status
  const usageStatus = getUsageStatus(
    entitlements,
    {
      usersCount,
      entitiesCount,
      invoicesThisMonth: company.invoicesThisMonth,
      certificatesThisMonth,
      quotesThisMonth: company.quotesThisMonth,
    },
    userEmail
  );

  // Check if enterprise is needed
  const enterpriseCheck = needsEnterprise({
    usersCount,
    entitiesCount,
    invoicesThisMonth: company.invoicesThisMonth,
    certificatesThisMonth,
  });

  // Build feature entitlements
  const features = {
    module_crm: hasEntitlement(entitlements, "module_crm", userEmail),
    module_certificates: hasEntitlement(entitlements, "module_certificates", userEmail),
    module_portal: hasEntitlement(entitlements, "module_portal", userEmail),
    module_tools: hasEntitlement(entitlements, "module_tools", userEmail),
    feature_schedule: hasEntitlement(entitlements, "feature_schedule", userEmail),
    feature_timesheets: hasEntitlement(entitlements, "feature_timesheets", userEmail),
    feature_xero: hasEntitlement(entitlements, "feature_xero", userEmail),
    feature_subdomain: hasEntitlement(entitlements, "feature_subdomain", userEmail),
    feature_dedicated_db: hasEntitlement(entitlements, "feature_dedicated_db", userEmail),
  };

  // Build limits
  const limits = {
    users: getLimit(entitlements, "users", userEmail),
    legal_entities: getLimit(entitlements, "legal_entities", userEmail),
    invoices_per_month: getLimit(entitlements, "invoices_per_month", userEmail),
    certificates_per_month: getLimit(entitlements, "certificates_per_month", userEmail),
    quotes_per_month: getLimit(entitlements, "quotes_per_month", userEmail),
    storage_mb: getLimit(entitlements, "storage_mb", userEmail),
  };

  return NextResponse.json({
    ok: true,
    plan: {
      tier: planTier,
      label: planDef.label,
      description: planDef.description,
      price: planDef.price,
    },
    trial: trialStatus,
    subscription: {
      status: company.subscriptionStatus,
      hasStripe: Boolean(company.stripeCustomerId),
      hasSubscription: Boolean(company.stripeSubscriptionId),
    },
    entitlements: {
      enabledModules,
      extraUsers: entitlements.extraUsers,
      extraEntities: entitlements.extraEntities,
      extraStorageMB: entitlements.extraStorageMB,
    },
    features,
    limits,
    usage: {
      usersCount,
      entitiesCount,
      invoicesThisMonth: company.invoicesThisMonth,
      certificatesThisMonth,
      quotesThisMonth: company.quotesThisMonth,
      storageUsedMB: 0, // Not tracked yet
      usageResetAt: company.usageResetAt,
    },
    usageStatus,
    enterpriseCheck,
    modulePricing: MODULE_PRICING,
  });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/entitlements", action: "get" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/entitlements", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
