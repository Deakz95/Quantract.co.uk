/**
 * Unified Entitlements Source of Truth
 *
 * This is THE canonical place for all plan/entitlement logic.
 * All apps (CRM, Certificates, Tools, Engineer, Client Portal) use this.
 *
 * Rules:
 * - UI checks named entitlements, NEVER plan strings directly
 * - Enterprise always returns true for all entitlements
 * - Server uses `requireEntitlement(key)` for API guards
 * - Client uses `hasEntitlement(key)` or `<EntitlementGate>`
 */

import { normalizePlan, getPlanDefinition, type PlanTier, type Module } from "./billing/plans";

// ============ Entitlement Keys ============
// All possible entitlement keys — UI/API only reference these, never plan names

export type EntitlementKey =
  // Modules
  | "module_crm"
  | "module_certificates"
  | "module_portal"
  | "module_tools"
  // Features
  | "feature_schedule"
  | "feature_timesheets"
  | "feature_xero"
  | "feature_subdomain"
  | "feature_custom_domain"
  | "feature_dedicated_db"
  | "feature_ai_estimator"
  | "feature_remote_assist"
  | "feature_truck_inventory"
  | "feature_maintenance_alerts"
  | "feature_lead_scoring"
  | "feature_portal_timeline"
  | "feature_portal_troubleshooter"
  // Limits (usage-based)
  | "limit_users"
  | "limit_legal_entities"
  | "limit_invoices_per_month"
  | "limit_certificates_per_month"
  | "limit_quotes_per_month"
  | "limit_storage_mb";

// ============ Entitlements Object ============

export type Entitlements = {
  plan: PlanTier;
  isEnterprise: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  // All entitlements as boolean or number
  [key: string]: boolean | number | string;
};

// ============ Core Functions ============

/**
 * Check if a plan is Enterprise tier.
 * Enterprise short-circuits all entitlement checks to true.
 */
export function isEnterprise(plan: string | null | undefined): boolean {
  const normalized = normalizePlan(plan);
  return normalized === "enterprise";
}

/**
 * Check if a plan is Pro or higher (Pro, Pro Plus, Enterprise).
 */
export function isProOrHigher(plan: string | null | undefined): boolean {
  const normalized = normalizePlan(plan);
  return normalized === "pro" || normalized === "pro_plus" || normalized === "enterprise";
}

/**
 * Resolve company plan with overrides.
 * Use this instead of reading company.plan directly.
 */
export function resolveCompanyPlan(
  plan: string | null | undefined,
  overrideEmail?: string | null
): PlanTier {
  // Admin bypass emails get Enterprise
  if (overrideEmail) {
    const bypassEmails = (process.env.ADMIN_BYPASS_EMAILS || process.env.NEXT_PUBLIC_ADMIN_BYPASS_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (bypassEmails.includes(overrideEmail.trim().toLowerCase())) {
      return "enterprise";
    }
  }
  return normalizePlan(plan);
}

/**
 * Compute all entitlements for a company.
 * This is the single source of truth.
 */
export function computeEntitlements(
  plan: string | null | undefined,
  options?: {
    overrideEmail?: string | null;
    enabledModules?: Module[];
    extraUsers?: number;
    extraEntities?: number;
    extraStorageMB?: number;
    trialStartedAt?: Date | null;
  }
): Entitlements {
  const resolvedPlan = resolveCompanyPlan(plan, options?.overrideEmail);
  const planDef = getPlanDefinition(resolvedPlan);
  const limits = planDef.limits;
  const enterprise = resolvedPlan === "enterprise";

  // Determine enabled modules
  const enabledModules = options?.enabledModules ?? limits.includedModules;

  // Trial status
  const isTrial = resolvedPlan === "trial";
  let isTrialExpired = false;
  if (isTrial && options?.trialStartedAt && limits.trialDays) {
    const endDate = new Date(options.trialStartedAt.getTime() + limits.trialDays * 24 * 60 * 60 * 1000);
    isTrialExpired = new Date() > endDate;
  }

  // Base entitlements — Enterprise gets everything
  const entitlements: Entitlements = {
    plan: resolvedPlan,
    isEnterprise: enterprise,
    isTrial,
    isTrialExpired,

    // Modules
    module_crm: enterprise || limits.includedModules.includes("crm") || enabledModules.includes("crm"),
    module_certificates: enterprise || limits.includedModules.includes("certificates") || enabledModules.includes("certificates"),
    module_portal: enterprise || limits.includedModules.includes("portal") || enabledModules.includes("portal"),
    module_tools: enterprise || limits.includedModules.includes("tools") || enabledModules.includes("tools"),

    // Features — Enterprise always true
    feature_schedule: enterprise || limits.includesSchedule,
    feature_timesheets: enterprise || limits.includesTimesheets,
    feature_xero: enterprise || limits.includesXeroIntegration,
    feature_subdomain: enterprise || limits.includesCustomSubdomain,
    feature_custom_domain: enterprise || isProOrHigher(resolvedPlan), // Pro+ gets custom domain
    feature_dedicated_db: enterprise || limits.includesDedicatedDb,
    feature_ai_estimator: enterprise || isProOrHigher(resolvedPlan),
    feature_remote_assist: enterprise || isProOrHigher(resolvedPlan),
    feature_truck_inventory: enterprise || isProOrHigher(resolvedPlan),
    feature_maintenance_alerts: enterprise || resolvedPlan !== "trial",
    feature_lead_scoring: enterprise || resolvedPlan !== "trial",
    feature_portal_timeline: true, // Available on all plans
    feature_portal_troubleshooter: true, // Available on all plans

    // Limits
    limit_users: enterprise ? Infinity : limits.includedUsers + (options?.extraUsers ?? 0),
    limit_legal_entities: enterprise ? Infinity : Math.min(limits.includedEntities + (options?.extraEntities ?? 0), limits.maxEntities),
    limit_invoices_per_month: enterprise ? Infinity : limits.invoicesPerMonth,
    limit_certificates_per_month: enterprise ? Infinity : limits.certificatesPerMonth,
    limit_quotes_per_month: enterprise ? Infinity : limits.quotesPerMonth,
    limit_storage_mb: enterprise ? Infinity : limits.storageMB + (options?.extraStorageMB ?? 0),
  };

  return entitlements;
}

/**
 * Check if a specific entitlement is enabled.
 * Use this in UI and server code.
 */
export function hasEntitlement(entitlements: Entitlements, key: EntitlementKey): boolean {
  // Enterprise override
  if (entitlements.isEnterprise) return true;

  const value = entitlements[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

/**
 * Get the numeric limit for a usage-based entitlement.
 */
export function getEntitlementLimit(entitlements: Entitlements, key: EntitlementKey): number {
  if (entitlements.isEnterprise) return Infinity;
  const value = entitlements[key];
  if (typeof value === "number") return value;
  return 0;
}

/**
 * Get the plan tier that unlocks a given entitlement.
 * Used for "Upgrade to X" messaging.
 */
export function getUnlockingPlan(key: EntitlementKey): PlanTier {
  const proFeatures: EntitlementKey[] = [
    "feature_custom_domain",
    "feature_ai_estimator",
    "feature_remote_assist",
    "feature_truck_inventory",
  ];
  const enterpriseFeatures: EntitlementKey[] = [
    "feature_dedicated_db",
  ];

  if (enterpriseFeatures.includes(key)) return "enterprise";
  if (proFeatures.includes(key)) return "pro";
  return "core";
}

/**
 * Get human-readable label for a plan tier.
 */
export function getPlanLabel(plan: PlanTier): string {
  const labels: Record<PlanTier, string> = {
    trial: "Trial",
    core: "Core",
    pro: "Pro",
    pro_plus: "Pro Plus",
    enterprise: "Enterprise",
  };
  return labels[plan] || "Unknown";
}
