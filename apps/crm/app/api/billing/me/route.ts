import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import {
  hasAdminBypass,
  normalizePlan,
  getPlanDefinition,
  getTrialStatus,
  getLimit,
  type OrgEntitlements,
  type Module,
  type PlanTier,
} from "@/lib/billing/plans";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  const authCtx = await requireCompanyContext();
  const companyId = authCtx.companyId;
  const userEmail = authCtx.email;
  const role = getEffectiveRole(authCtx);
  const client = getPrisma();

  if (!client) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 400 }
    );
  }

  const company = await client.company.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      trialEnd: true,
      trialStartedAt: true,
      billing: {
        select: {
          plan: true,
          subscriptionStatus: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          trialStartedAt: true,
          trialEnd: true,
          enabledModules: true,
          extraUsers: true,
          extraEntities: true,
          extraStorageMB: true,
        },
      },
    },
  });

  if (!company) {
    return NextResponse.json(
      { ok: false, error: "company_not_found" },
      { status: 404 }
    );
  }

  const billing = company.billing;
  const hasBypass = hasAdminBypass(userEmail);

  const rawPlan = billing?.plan || company.plan;
  const effectivePlan: PlanTier = hasBypass ? "enterprise" : normalizePlan(rawPlan);
  const planDef = getPlanDefinition(rawPlan, hasBypass ? userEmail : undefined);

  const effectiveStatus = hasBypass
    ? "active"
    : billing?.subscriptionStatus || company.subscriptionStatus || "inactive";

  const trialStatus = getTrialStatus(
    rawPlan,
    billing?.trialStartedAt || company.trialStartedAt,
    hasBypass ? userEmail : undefined
  );

  const enabledModules = (billing?.enabledModules || []) as Module[];

  // Build entitlements
  const entitlements: OrgEntitlements = {
    plan: effectivePlan,
    enabledModules,
    extraUsers: billing?.extraUsers || 0,
    extraEntities: billing?.extraEntities || 0,
    extraStorageMB: billing?.extraStorageMB || 0,
  };

  // Compute key entitlement values
  const computed = {
    maxUsers: getLimit(entitlements, "users", hasBypass ? userEmail : undefined),
    maxEntities: getLimit(entitlements, "legal_entities", hasBypass ? userEmail : undefined),
    invoicesPerMonth: getLimit(entitlements, "invoices_per_month", hasBypass ? userEmail : undefined),
    certificatesPerMonth: getLimit(entitlements, "certificates_per_month", hasBypass ? userEmail : undefined),
    storageMB: getLimit(entitlements, "storage_mb", hasBypass ? userEmail : undefined),
    moduleCrm: getLimit(entitlements, "module_crm", hasBypass ? userEmail : undefined),
    moduleCertificates: getLimit(entitlements, "module_certificates", hasBypass ? userEmail : undefined),
    modulePortal: getLimit(entitlements, "module_portal", hasBypass ? userEmail : undefined),
    moduleTools: getLimit(entitlements, "module_tools", hasBypass ? userEmail : undefined),
    featureSchedule: getLimit(entitlements, "feature_schedule", hasBypass ? userEmail : undefined),
    featureTimesheets: getLimit(entitlements, "feature_timesheets", hasBypass ? userEmail : undefined),
    featureXero: getLimit(entitlements, "feature_xero", hasBypass ? userEmail : undefined),
  };

  return NextResponse.json({
    ok: true,
    role,
    plan: effectivePlan,
    planLabel: planDef.label,
    subscriptionStatus: effectiveStatus,
    currentPeriodEnd: billing?.currentPeriodEnd || company.currentPeriodEnd || null,
    cancelAtPeriodEnd: billing?.cancelAtPeriodEnd || false,
    hasBypass,
    trial: trialStatus,
    modules: enabledModules,
    addOns: {
      extraUsers: billing?.extraUsers || 0,
      extraEntities: billing?.extraEntities || 0,
      extraStorageMB: billing?.extraStorageMB || 0,
    },
    entitlements: computed,
  });
});
