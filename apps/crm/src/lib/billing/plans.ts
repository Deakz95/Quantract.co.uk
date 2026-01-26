/**
 * Quantract Billing Plans & Entitlements
 *
 * New pricing model (Jan 2026):
 * - Core: £19/mo (foundation)
 * - Modules: CRM £19, Certificates £15, Portal £7, Tools £7
 * - Pro Bundle: £79/mo (Core + all modules + higher limits)
 * - Enterprise: £299+/mo (custom)
 *
 * Entitlements track: users, legal entities, invoices/mo, certificates/mo, storage
 */

// ============ Plan Types ============

export type PlanTier = "trial" | "core" | "pro" | "enterprise";

// Modules that can be enabled/disabled
export type Module = "crm" | "certificates" | "portal" | "tools";

export type PlanLimits = {
  // User limits
  includedUsers: number;
  maxUsers: number; // Hard cap
  extraUserPrice: number; // Per user per month

  // Entity limits (for multi-entity billing)
  includedEntities: number;
  maxEntities: number;
  extraEntityPrice: number;

  // Usage limits (per month)
  invoicesPerMonth: number;
  certificatesPerMonth: number;
  quotesPerMonth: number;

  // Storage (MB)
  storageMB: number;

  // Trial
  trialDays: number | null;

  // Included modules
  includedModules: Module[];

  // Feature flags
  includesSchedule: boolean;
  includesTimesheets: boolean;
  includesCustomSubdomain: boolean;
  includesDedicatedDb: boolean;
  includesXeroIntegration: boolean;
  includesPortal: boolean;

  // Legacy limits (backward compatibility)
  maxJobs: number;
  maxEngineers: number;
  maxClients: number;
};

export type PlanDefinition = {
  id: PlanTier;
  label: string;
  description: string;
  price: number | null; // Monthly price in GBP, null = custom
  limits: PlanLimits;
};

// ============ Plan Definitions ============

const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  trial: {
    id: "trial",
    label: "Trial",
    description: "14-day free trial with full Pro access",
    price: 0,
    limits: {
      includedUsers: 10,
      maxUsers: 10,
      extraUserPrice: 0,
      includedEntities: 2,
      maxEntities: 2,
      extraEntityPrice: 0,
      invoicesPerMonth: 50,
      certificatesPerMonth: 30,
      quotesPerMonth: 20,
      storageMB: 5000, // 5GB
      trialDays: 14,
      includedModules: ["crm", "certificates", "portal", "tools"],
      includesSchedule: true,
      includesTimesheets: true,
      includesCustomSubdomain: true,
      includesDedicatedDb: false,
      includesXeroIntegration: true,
      includesPortal: true,
      // Legacy limits
      maxJobs: 50,
      maxEngineers: 10,
      maxClients: 50,
    },
  },
  core: {
    id: "core",
    label: "Core",
    description: "Foundation plan - add modules as needed",
    price: 19,
    limits: {
      includedUsers: 3,
      maxUsers: 50, // Soft cap before enterprise
      extraUserPrice: 4,
      includedEntities: 1,
      maxEntities: 5, // Can buy up to 5 before enterprise
      extraEntityPrice: 15,
      invoicesPerMonth: 0, // Requires CRM module
      certificatesPerMonth: 0, // Requires Certificates module
      quotesPerMonth: 50,
      storageMB: 10000, // 10GB
      trialDays: null,
      includedModules: [], // No modules by default
      includesSchedule: false,
      includesTimesheets: false,
      includesCustomSubdomain: true,
      includesDedicatedDb: false,
      includesXeroIntegration: false,
      includesPortal: false,
      // Legacy limits
      maxJobs: 100,
      maxEngineers: 50,
      maxClients: 200,
    },
  },
  pro: {
    id: "pro",
    label: "Pro",
    description: "Everything included - best value",
    price: 79,
    limits: {
      includedUsers: 10,
      maxUsers: 50, // Soft cap before enterprise
      extraUserPrice: 3,
      includedEntities: 2,
      maxEntities: 5, // Can buy up to 5 before enterprise
      extraEntityPrice: 15,
      invoicesPerMonth: 500,
      certificatesPerMonth: 300,
      quotesPerMonth: Infinity,
      storageMB: 102400, // 100GB
      trialDays: null,
      includedModules: ["crm", "certificates", "portal", "tools"],
      includesSchedule: true,
      includesTimesheets: true,
      includesCustomSubdomain: true,
      includesDedicatedDb: false,
      includesXeroIntegration: true,
      includesPortal: true,
      // Legacy limits
      maxJobs: Infinity,
      maxEngineers: 50,
      maxClients: Infinity,
    },
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    description: "Custom solution with dedicated infrastructure",
    price: null, // Custom pricing, starting from £299
    limits: {
      includedUsers: Infinity,
      maxUsers: Infinity,
      extraUserPrice: 0,
      includedEntities: Infinity,
      maxEntities: Infinity,
      extraEntityPrice: 0,
      invoicesPerMonth: Infinity,
      certificatesPerMonth: Infinity,
      quotesPerMonth: Infinity,
      storageMB: Infinity,
      trialDays: null,
      includedModules: ["crm", "certificates", "portal", "tools"],
      includesSchedule: true,
      includesTimesheets: true,
      includesCustomSubdomain: true,
      includesDedicatedDb: true,
      includesXeroIntegration: true,
      includesPortal: true,
      // Legacy limits
      maxJobs: Infinity,
      maxEngineers: Infinity,
      maxClients: Infinity,
    },
  },
};

// Module pricing (when added to Core)
export const MODULE_PRICING: Record<Module, { price: number; label: string; limits?: Partial<PlanLimits> }> = {
  crm: {
    price: 19,
    label: "CRM Module",
    limits: {
      invoicesPerMonth: 300,
      includesSchedule: true,
      includesTimesheets: true,
      includesXeroIntegration: true,
    },
  },
  certificates: {
    price: 15,
    label: "Certificates Module",
    limits: {
      certificatesPerMonth: 150,
    },
  },
  portal: {
    price: 7,
    label: "Customer Portal",
    limits: {
      includesPortal: true,
    },
  },
  tools: {
    price: 7,
    label: "Tools Pack",
    limits: {}, // No specific limits, just feature access
  },
};

// ============ Plan Helpers ============

/**
 * Check if an email has admin bypass for plan limits.
 */
export function hasAdminBypass(email?: string | null): boolean {
  if (!email) return false;
  const bypassEmails = process.env.ADMIN_BYPASS_EMAILS || process.env.NEXT_PUBLIC_ADMIN_BYPASS_EMAILS || "";
  const allowedEmails = bypassEmails.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  return allowedEmails.includes(email.trim().toLowerCase());
}

/**
 * Normalize plan string to PlanTier.
 * Maps old "solo"/"team" plans to appropriate new tiers.
 */
export function normalizePlan(plan?: string | null): PlanTier {
  const value = String(plan || "trial").trim().toLowerCase();

  // Map old plans to new structure
  if (value === "free" || value === "trial") return "trial";
  if (value === "solo") return "core"; // Old solo -> core
  if (value === "team") return "pro"; // Old team -> pro
  if (value === "pro") return "pro";
  if (value === "core") return "core";
  if (value === "enterprise") return "enterprise";

  return "trial";
}

export function getPlanDefinition(plan?: string | null, bypassEmail?: string | null): PlanDefinition {
  if (hasAdminBypass(bypassEmail)) {
    return PLAN_DEFINITIONS.enterprise;
  }
  return PLAN_DEFINITIONS[normalizePlan(plan)];
}

export function getPlanLimits(plan?: string | null, bypassEmail?: string | null): PlanLimits {
  return getPlanDefinition(plan, bypassEmail).limits;
}

export function getAllPlans(): PlanDefinition[] {
  return Object.values(PLAN_DEFINITIONS);
}

// ============ Trial Status ============

export type TrialStatus = {
  isTrialPlan: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  daysRemaining: number | null;
  isExpired: boolean;
};

export function getTrialStatus(
  plan: string | null | undefined,
  trialStartedAt: Date | string | null,
  bypassEmail?: string | null
): TrialStatus {
  if (hasAdminBypass(bypassEmail)) {
    return { isTrialPlan: false, trialStartedAt: null, trialEndsAt: null, daysRemaining: null, isExpired: false };
  }

  const normalizedPlan = normalizePlan(plan);
  const limits = getPlanLimits(plan);

  if (normalizedPlan !== "trial" || !limits.trialDays) {
    return { isTrialPlan: false, trialStartedAt: null, trialEndsAt: null, daysRemaining: null, isExpired: false };
  }

  if (!trialStartedAt) {
    return { isTrialPlan: true, trialStartedAt: null, trialEndsAt: null, daysRemaining: limits.trialDays, isExpired: false };
  }

  const startDate = typeof trialStartedAt === "string" ? new Date(trialStartedAt) : trialStartedAt;
  const endDate = new Date(startDate.getTime() + limits.trialDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  const isExpired = now > endDate;

  return {
    isTrialPlan: true,
    trialStartedAt: startDate,
    trialEndsAt: endDate,
    daysRemaining,
    isExpired,
  };
}

// ============ Entitlements System ============

export type EntitlementKey =
  | "users"
  | "legal_entities"
  | "invoices_per_month"
  | "certificates_per_month"
  | "quotes_per_month"
  | "storage_mb"
  | "module_crm"
  | "module_certificates"
  | "module_portal"
  | "module_tools"
  | "feature_schedule"
  | "feature_timesheets"
  | "feature_xero"
  | "feature_subdomain"
  | "feature_dedicated_db";

export type UsageMetric =
  | "users"
  | "legal_entities"
  | "invoices_this_month"
  | "certificates_this_month"
  | "quotes_this_month"
  | "storage_used_mb";

/**
 * Organization entitlements derived from plan + modules + add-ons.
 * In production, this would be fetched from DB with purchased add-ons.
 */
export type OrgEntitlements = {
  plan: PlanTier;
  enabledModules: Module[];
  extraUsers: number; // Purchased extra user seats
  extraEntities: number; // Purchased extra legal entities
  extraStorageMB: number; // Purchased extra storage
};

/**
 * Get the effective limit for a given entitlement key.
 */
export function getLimit(
  entitlements: OrgEntitlements,
  key: EntitlementKey,
  bypassEmail?: string | null
): number | boolean {
  if (hasAdminBypass(bypassEmail)) {
    // Admin bypass gets unlimited/enabled for everything
    if (key.startsWith("module_") || key.startsWith("feature_")) return true;
    return Infinity;
  }

  const planLimits = PLAN_DEFINITIONS[entitlements.plan].limits;
  const modules = entitlements.enabledModules;

  switch (key) {
    case "users":
      return planLimits.includedUsers + entitlements.extraUsers;

    case "legal_entities":
      return Math.min(
        planLimits.includedEntities + entitlements.extraEntities,
        planLimits.maxEntities
      );

    case "invoices_per_month": {
      // Base from plan + module bonus
      let limit = planLimits.invoicesPerMonth;
      if (modules.includes("crm") && entitlements.plan === "core") {
        limit += MODULE_PRICING.crm.limits?.invoicesPerMonth || 0;
      }
      return limit;
    }

    case "certificates_per_month": {
      let limit = planLimits.certificatesPerMonth;
      if (modules.includes("certificates") && entitlements.plan === "core") {
        limit += MODULE_PRICING.certificates.limits?.certificatesPerMonth || 0;
      }
      return limit;
    }

    case "quotes_per_month":
      return planLimits.quotesPerMonth;

    case "storage_mb":
      return planLimits.storageMB + entitlements.extraStorageMB;

    case "module_crm":
      return planLimits.includedModules.includes("crm") || modules.includes("crm");

    case "module_certificates":
      return planLimits.includedModules.includes("certificates") || modules.includes("certificates");

    case "module_portal":
      return planLimits.includedModules.includes("portal") || modules.includes("portal");

    case "module_tools":
      return planLimits.includedModules.includes("tools") || modules.includes("tools");

    case "feature_schedule":
      return planLimits.includesSchedule || (modules.includes("crm") && entitlements.plan === "core");

    case "feature_timesheets":
      return planLimits.includesTimesheets || (modules.includes("crm") && entitlements.plan === "core");

    case "feature_xero":
      return planLimits.includesXeroIntegration || (modules.includes("crm") && entitlements.plan === "core");

    case "feature_subdomain":
      return planLimits.includesCustomSubdomain;

    case "feature_dedicated_db":
      return planLimits.includesDedicatedDb;

    default:
      return false;
  }
}

/**
 * Check if an organization has a specific entitlement.
 */
export function hasEntitlement(
  entitlements: OrgEntitlements,
  key: EntitlementKey,
  bypassEmail?: string | null
): boolean {
  const limit = getLimit(entitlements, key, bypassEmail);
  if (typeof limit === "boolean") return limit;
  return limit > 0;
}

/**
 * Check if usage is within limits.
 */
export function isWithinLimit(
  entitlements: OrgEntitlements,
  metric: UsageMetric,
  currentUsage: number,
  bypassEmail?: string | null
): boolean {
  if (hasAdminBypass(bypassEmail)) return true;

  const metricToKey: Record<UsageMetric, EntitlementKey> = {
    users: "users",
    legal_entities: "legal_entities",
    invoices_this_month: "invoices_per_month",
    certificates_this_month: "certificates_per_month",
    quotes_this_month: "quotes_per_month",
    storage_used_mb: "storage_mb",
  };

  const limit = getLimit(entitlements, metricToKey[metric], bypassEmail);
  if (typeof limit === "boolean") return limit;
  return currentUsage < limit;
}

/**
 * Get remaining capacity for a metric.
 */
export function getRemainingCapacity(
  entitlements: OrgEntitlements,
  metric: UsageMetric,
  currentUsage: number,
  bypassEmail?: string | null
): number {
  if (hasAdminBypass(bypassEmail)) return Infinity;

  const metricToKey: Record<UsageMetric, EntitlementKey> = {
    users: "users",
    legal_entities: "legal_entities",
    invoices_this_month: "invoices_per_month",
    certificates_this_month: "certificates_per_month",
    quotes_this_month: "quotes_per_month",
    storage_used_mb: "storage_mb",
  };

  const limit = getLimit(entitlements, metricToKey[metric], bypassEmail);
  if (typeof limit === "boolean") return limit ? Infinity : 0;
  return Math.max(0, limit - currentUsage);
}

// ============ Usage Status (Legacy Compatible) ============

export type UsageStatus = {
  usersCount: number;
  usersLimit: number;
  usersRemaining: number;
  usersLimitReached: boolean;

  entitiesCount: number;
  entitiesLimit: number;
  entitiesRemaining: number;
  entitiesLimitReached: boolean;

  invoicesUsed: number;
  invoicesLimit: number;
  invoicesRemaining: number;
  invoicesLimitReached: boolean;

  certificatesUsed: number;
  certificatesLimit: number;
  certificatesRemaining: number;
  certificatesLimitReached: boolean;

  quotesUsed: number;
  quotesLimit: number;
  quotesRemaining: number;
  quotesLimitReached: boolean;

  // Legacy fields for backward compatibility
  jobsCount?: number;
  jobsLimit?: number;
  jobsRemaining?: number;
  jobsLimitReached?: boolean;

  engineersCount?: number;
  engineersLimit?: number;
  engineersRemaining?: number;
  engineersLimitReached?: boolean;

  clientsCount?: number;
  clientsLimit?: number;
  clientsRemaining?: number;
  clientsLimitReached?: boolean;
};

export function getUsageStatus(
  entitlements: OrgEntitlements,
  usage: {
    usersCount: number;
    entitiesCount: number;
    invoicesThisMonth: number;
    certificatesThisMonth: number;
    quotesThisMonth: number;
  },
  bypassEmail?: string | null
): UsageStatus {
  const usersLimit = getLimit(entitlements, "users", bypassEmail) as number;
  const entitiesLimit = getLimit(entitlements, "legal_entities", bypassEmail) as number;
  const invoicesLimit = getLimit(entitlements, "invoices_per_month", bypassEmail) as number;
  const certificatesLimit = getLimit(entitlements, "certificates_per_month", bypassEmail) as number;
  const quotesLimit = getLimit(entitlements, "quotes_per_month", bypassEmail) as number;

  return {
    usersCount: usage.usersCount,
    usersLimit,
    usersRemaining: Math.max(0, usersLimit - usage.usersCount),
    usersLimitReached: usage.usersCount >= usersLimit,

    entitiesCount: usage.entitiesCount,
    entitiesLimit,
    entitiesRemaining: Math.max(0, entitiesLimit - usage.entitiesCount),
    entitiesLimitReached: usage.entitiesCount >= entitiesLimit,

    invoicesUsed: usage.invoicesThisMonth,
    invoicesLimit,
    invoicesRemaining: Math.max(0, invoicesLimit - usage.invoicesThisMonth),
    invoicesLimitReached: usage.invoicesThisMonth >= invoicesLimit,

    certificatesUsed: usage.certificatesThisMonth,
    certificatesLimit,
    certificatesRemaining: Math.max(0, certificatesLimit - usage.certificatesThisMonth),
    certificatesLimitReached: usage.certificatesThisMonth >= certificatesLimit,

    quotesUsed: usage.quotesThisMonth,
    quotesLimit,
    quotesRemaining: Math.max(0, quotesLimit - usage.quotesThisMonth),
    quotesLimitReached: usage.quotesThisMonth >= quotesLimit,
  };
}

// ============ Upgrade Suggestions ============

export type UpgradeSuggestion = {
  reason: string;
  currentPlan: PlanTier;
  suggestedAction: "upgrade_plan" | "add_module" | "buy_addon" | "contact_enterprise";
  suggestedPlan?: PlanTier;
  suggestedModule?: Module;
  suggestedAddon?: "users" | "entities" | "storage";
  benefit: string;
};

export function getUpgradeSuggestion(
  entitlements: OrgEntitlements,
  limitType: "users" | "entities" | "invoices" | "certificates" | "quotes" | "storage" | "trial_expired" | "module_crm" | "module_certificates" | "module_portal"
): UpgradeSuggestion | null {
  const { plan } = entitlements;

  const suggestions: Record<string, UpgradeSuggestion> = {
    trial_expired: {
      reason: "Your trial has expired",
      currentPlan: plan,
      suggestedAction: "upgrade_plan",
      suggestedPlan: "core",
      benefit: "Continue using Quantract with Core plan at £19/month",
    },
    users: {
      reason: "You've reached your user limit",
      currentPlan: plan,
      suggestedAction: plan === "core" ? "buy_addon" : "contact_enterprise",
      suggestedAddon: "users",
      suggestedPlan: plan === "core" ? "pro" : undefined,
      benefit: plan === "core" ? "Add extra users at £4/user/month, or upgrade to Pro for 10 users included" : "Contact us for Enterprise pricing with unlimited users",
    },
    entities: {
      reason: "You've reached your legal entity limit",
      currentPlan: plan,
      suggestedAction: plan === "enterprise" ? "contact_enterprise" : "buy_addon",
      suggestedAddon: "entities",
      benefit: "Add extra legal entities at £15/entity/month for Multi-Entity Billing",
    },
    invoices: {
      reason: "You've reached your monthly invoice limit",
      currentPlan: plan,
      suggestedAction: plan === "core" ? "add_module" : plan === "pro" ? "contact_enterprise" : "upgrade_plan",
      suggestedModule: "crm",
      benefit: plan === "core" ? "Add CRM module for 300 invoices/month" : "Contact us for higher limits",
    },
    certificates: {
      reason: "You've reached your monthly certificate limit",
      currentPlan: plan,
      suggestedAction: plan === "core" ? "add_module" : plan === "pro" ? "contact_enterprise" : "upgrade_plan",
      suggestedModule: "certificates",
      benefit: plan === "core" ? "Add Certificates module for 150 certs/month" : "Contact us for higher limits",
    },
    quotes: {
      reason: "You've reached your monthly quote limit",
      currentPlan: plan,
      suggestedAction: "upgrade_plan",
      suggestedPlan: "pro",
      benefit: "Upgrade to Pro for unlimited quotes",
    },
    storage: {
      reason: "You're running low on storage",
      currentPlan: plan,
      suggestedAction: "buy_addon",
      suggestedAddon: "storage",
      benefit: "Add extra storage at £5 per 50GB/month",
    },
    module_crm: {
      reason: "CRM features require the CRM module",
      currentPlan: plan,
      suggestedAction: plan === "core" ? "add_module" : "upgrade_plan",
      suggestedModule: "crm",
      suggestedPlan: "pro",
      benefit: "Add CRM module for jobs, invoicing, and scheduling",
    },
    module_certificates: {
      reason: "Certificate features require the Certificates module",
      currentPlan: plan,
      suggestedAction: plan === "core" ? "add_module" : "upgrade_plan",
      suggestedModule: "certificates",
      suggestedPlan: "pro",
      benefit: "Add Certificates module for digital certificate generation",
    },
    module_portal: {
      reason: "Customer Portal requires the Portal module",
      currentPlan: plan,
      suggestedAction: plan === "core" ? "add_module" : "upgrade_plan",
      suggestedModule: "portal",
      suggestedPlan: "pro",
      benefit: "Add Portal module for client self-service",
    },
  };

  return suggestions[limitType] || null;
}

// ============ Enterprise Triggers ============

export function needsEnterprise(
  usage: {
    usersCount: number;
    entitiesCount: number;
    invoicesThisMonth: number;
    certificatesThisMonth: number;
  }
): { needed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (usage.usersCount >= 50) reasons.push("50+ users");
  if (usage.entitiesCount > 5) reasons.push("More than 5 legal entities");
  if (usage.invoicesThisMonth >= 2000) reasons.push("2,000+ invoices/month");
  if (usage.certificatesThisMonth >= 1000) reasons.push("1,000+ certificates/month");

  return {
    needed: reasons.length > 0,
    reasons,
  };
}

// ============ Legacy Compatibility ============

// Keep old functions working for backward compatibility

export function isScheduleEnabled(plan?: string | null, bypassEmail?: string | null): boolean {
  if (hasAdminBypass(bypassEmail)) return true;
  return getPlanLimits(plan, bypassEmail).includesSchedule;
}

export function isTimesheetsEnabled(plan?: string | null, bypassEmail?: string | null): boolean {
  if (hasAdminBypass(bypassEmail)) return true;
  return getPlanLimits(plan, bypassEmail).includesTimesheets;
}

export function isCertsIncluded(plan?: string | null, bypassEmail?: string | null): boolean {
  if (hasAdminBypass(bypassEmail)) return true;
  const limits = getPlanLimits(plan, bypassEmail);
  return limits.includedModules.includes("certificates") || limits.certificatesPerMonth > 0;
}

export function isCustomSubdomainEnabled(plan?: string | null, bypassEmail?: string | null): boolean {
  if (hasAdminBypass(bypassEmail)) return true;
  return getPlanLimits(plan, bypassEmail).includesCustomSubdomain;
}

export function isDedicatedDbEnabled(plan?: string | null, bypassEmail?: string | null): boolean {
  return getPlanLimits(plan, bypassEmail).includesDedicatedDb;
}

export function getEngineerLimit(plan?: string | null, bypassEmail?: string | null): number {
  // Engineers are now just users
  return getPlanLimits(plan, bypassEmail).includedUsers;
}

export function isEngineerLimitReached(plan: string | null | undefined, count: number, bypassEmail?: string | null): boolean {
  if (hasAdminBypass(bypassEmail)) return false;
  const limit = getEngineerLimit(plan, bypassEmail);
  return Number.isFinite(limit) && count >= limit;
}

// Keep old certsDiscount for backward compatibility
export function getCertsDiscount(plan?: string | null, bypassEmail?: string | null): number {
  if (hasAdminBypass(bypassEmail)) return 1;
  const limits = getPlanLimits(plan, bypassEmail);
  if (limits.includedModules.includes("certificates")) return 1; // Free/included
  return 0;
}
