export type PlanTier = "trial" | "solo" | "team" | "pro" | "enterprise";

export type PlanLimits = {
  quotesPerMonth: number;
  invoicesPerMonth: number;
  maxEngineers: number;
  maxClients: number;
  maxJobs: number;
  trialDays: number | null; // null = no trial limit
  includesSchedule: boolean;
  includesTimesheets: boolean;
  includesCerts: boolean;
  certsDiscount: number; // 0 = no discount, 0.2 = 20% off, 1 = free (included)
  includesCustomSubdomain: boolean;
  includesDedicatedDb: boolean;
};

export type PlanDefinition = {
  id: PlanTier;
  label: string;
  description: string;
  price: number | null; // Monthly price in GBP, null = custom pricing
  limits: PlanLimits;
};

const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  trial: {
    id: "trial",
    label: "Trial",
    description: "14-day free trial with full access",
    price: 0,
    limits: {
      quotesPerMonth: 5,
      invoicesPerMonth: 3,
      maxEngineers: 1,
      maxClients: 3,
      maxJobs: 3,
      trialDays: 14,
      includesSchedule: true,
      includesTimesheets: true,
      includesCerts: false, // Preview only
      certsDiscount: 0,
      includesCustomSubdomain: false,
      includesDedicatedDb: false,
    },
  },
  solo: {
    id: "solo",
    label: "Solo",
    description: "Perfect for one-person businesses",
    price: 19,
    limits: {
      quotesPerMonth: 20,
      invoicesPerMonth: 15,
      maxEngineers: 1,
      maxClients: 10,
      maxJobs: 10,
      trialDays: null,
      includesSchedule: false,
      includesTimesheets: false,
      includesCerts: false, // Paid add-on
      certsDiscount: 0,
      includesCustomSubdomain: true,
      includesDedicatedDb: false,
    },
  },
  team: {
    id: "team",
    label: "Team",
    description: "For growing electrical businesses",
    price: 49,
    limits: {
      quotesPerMonth: 100,
      invoicesPerMonth: 75,
      maxEngineers: 5,
      maxClients: 50,
      maxJobs: 50,
      trialDays: null,
      includesSchedule: true,
      includesTimesheets: true,
      includesCerts: false, // 20% discount
      certsDiscount: 0.2,
      includesCustomSubdomain: true,
      includesDedicatedDb: false,
    },
  },
  pro: {
    id: "pro",
    label: "Pro",
    description: "Unlimited access for established contractors",
    price: 99,
    limits: {
      quotesPerMonth: Infinity,
      invoicesPerMonth: Infinity,
      maxEngineers: Infinity,
      maxClients: Infinity,
      maxJobs: Infinity,
      trialDays: null,
      includesSchedule: true,
      includesTimesheets: true,
      includesCerts: true, // Included!
      certsDiscount: 1,
      includesCustomSubdomain: true,
      includesDedicatedDb: false,
    },
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    description: "Custom solution with dedicated infrastructure",
    price: null, // Custom pricing
    limits: {
      quotesPerMonth: Infinity,
      invoicesPerMonth: Infinity,
      maxEngineers: Infinity,
      maxClients: Infinity,
      maxJobs: Infinity,
      trialDays: null,
      includesSchedule: true,
      includesTimesheets: true,
      includesCerts: true,
      certsDiscount: 1,
      includesCustomSubdomain: true,
      includesDedicatedDb: true,
    },
  },
};

/**
 * Check if an email has admin bypass for plan limits.
 * Set ADMIN_BYPASS_EMAILS env var as comma-separated list of emails.
 */
export function hasAdminBypass(email?: string | null): boolean {
  if (!email) return false;
  const bypassEmails = process.env.ADMIN_BYPASS_EMAILS || process.env.NEXT_PUBLIC_ADMIN_BYPASS_EMAILS || "";
  const allowedEmails = bypassEmails.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  return allowedEmails.includes(email.trim().toLowerCase());
}

export function normalizePlan(plan?: string | null): PlanTier {
  const value = String(plan || "trial").trim().toLowerCase();
  // Map old "free" to "trial"
  if (value === "free") return "trial";
  if (value === "solo" || value === "team" || value === "pro" || value === "trial" || value === "enterprise") {
    return value;
  }
  return "trial";
}

export function getPlanDefinition(plan?: string | null, bypassEmail?: string | null): PlanDefinition {
  if (hasAdminBypass(bypassEmail)) {
    return PLAN_DEFINITIONS.pro;
  }
  return PLAN_DEFINITIONS[normalizePlan(plan)];
}

export function getPlanLimits(plan?: string | null, bypassEmail?: string | null): PlanLimits {
  return getPlanDefinition(plan, bypassEmail).limits;
}

export function getAllPlans(): PlanDefinition[] {
  return Object.values(PLAN_DEFINITIONS);
}

// ============ Trial Expiration ============

export type TrialStatus = {
  isTrialPlan: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  daysRemaining: number | null;
  isExpired: boolean;
};

export function getTrialStatus(plan: string | null | undefined, trialStartedAt: Date | string | null, bypassEmail?: string | null): TrialStatus {
  if (hasAdminBypass(bypassEmail)) {
    return { isTrialPlan: false, trialStartedAt: null, trialEndsAt: null, daysRemaining: null, isExpired: false };
  }

  const normalizedPlan = normalizePlan(plan);
  const limits = getPlanLimits(plan);
  
  if (normalizedPlan !== "trial" || !limits.trialDays) {
    return { isTrialPlan: false, trialStartedAt: null, trialEndsAt: null, daysRemaining: null, isExpired: false };
  }

  if (!trialStartedAt) {
    // Trial not started yet - will start on first action
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

// ============ Usage Limits ============

export type UsageStatus = {
  quotesUsed: number;
  quotesLimit: number;
  quotesRemaining: number;
  quotesLimitReached: boolean;
  
  invoicesUsed: number;
  invoicesLimit: number;
  invoicesRemaining: number;
  invoicesLimitReached: boolean;
  
  engineersCount: number;
  engineersLimit: number;
  engineersRemaining: number;
  engineersLimitReached: boolean;
  
  clientsCount: number;
  clientsLimit: number;
  clientsRemaining: number;
  clientsLimitReached: boolean;
  
  jobsCount: number;
  jobsLimit: number;
  jobsRemaining: number;
  jobsLimitReached: boolean;
};

export function getUsageStatus(
  plan: string | null | undefined,
  usage: {
    quotesThisMonth: number;
    invoicesThisMonth: number;
    engineersCount: number;
    clientsCount: number;
    jobsCount: number;
  },
  bypassEmail?: string | null
): UsageStatus {
  const limits = getPlanLimits(plan, bypassEmail);
  
  const quotesRemaining = Math.max(0, limits.quotesPerMonth - usage.quotesThisMonth);
  const invoicesRemaining = Math.max(0, limits.invoicesPerMonth - usage.invoicesThisMonth);
  const engineersRemaining = Math.max(0, limits.maxEngineers - usage.engineersCount);
  const clientsRemaining = Math.max(0, limits.maxClients - usage.clientsCount);
  const jobsRemaining = Math.max(0, limits.maxJobs - usage.jobsCount);

  return {
    quotesUsed: usage.quotesThisMonth,
    quotesLimit: limits.quotesPerMonth,
    quotesRemaining,
    quotesLimitReached: usage.quotesThisMonth >= limits.quotesPerMonth,
    
    invoicesUsed: usage.invoicesThisMonth,
    invoicesLimit: limits.invoicesPerMonth,
    invoicesRemaining,
    invoicesLimitReached: usage.invoicesThisMonth >= limits.invoicesPerMonth,
    
    engineersCount: usage.engineersCount,
    engineersLimit: limits.maxEngineers,
    engineersRemaining,
    engineersLimitReached: usage.engineersCount >= limits.maxEngineers,
    
    clientsCount: usage.clientsCount,
    clientsLimit: limits.maxClients,
    clientsRemaining,
    clientsLimitReached: usage.clientsCount >= limits.maxClients,
    
    jobsCount: usage.jobsCount,
    jobsLimit: limits.maxJobs,
    jobsRemaining,
    jobsLimitReached: usage.jobsCount >= limits.maxJobs,
  };
}

// ============ Feature Checks ============

export function isScheduleEnabled(plan?: string | null, bypassEmail?: string | null): boolean {
  return getPlanLimits(plan, bypassEmail).includesSchedule;
}

export function isTimesheetsEnabled(plan?: string | null, bypassEmail?: string | null): boolean {
  return getPlanLimits(plan, bypassEmail).includesTimesheets;
}

export function isCertsIncluded(plan?: string | null, bypassEmail?: string | null): boolean {
  return getPlanLimits(plan, bypassEmail).includesCerts;
}

export function getCertsDiscount(plan?: string | null, bypassEmail?: string | null): number {
  return getPlanLimits(plan, bypassEmail).certsDiscount;
}

export function isCustomSubdomainEnabled(plan?: string | null, bypassEmail?: string | null): boolean {
  if (hasAdminBypass(bypassEmail)) return true;
  return getPlanLimits(plan, bypassEmail).includesCustomSubdomain;
}

export function isDedicatedDbEnabled(plan?: string | null, bypassEmail?: string | null): boolean {
  return getPlanLimits(plan, bypassEmail).includesDedicatedDb;
}

// ============ Legacy compatibility ============

export function getEngineerLimit(plan?: string | null, bypassEmail?: string | null): number {
  return getPlanLimits(plan, bypassEmail).maxEngineers;
}

export function isEngineerLimitReached(plan: string | null | undefined, count: number, bypassEmail?: string | null): boolean {
  if (hasAdminBypass(bypassEmail)) return false;
  const limit = getEngineerLimit(plan, bypassEmail);
  return Number.isFinite(limit) && count >= limit;
}

// ============ Upgrade Suggestions ============

export type UpgradeSuggestion = {
  reason: string;
  currentPlan: PlanTier;
  suggestedPlan: PlanTier;
  benefit: string;
};

export function getUpgradeSuggestion(
  plan: string | null | undefined,
  limitType: "quotes" | "invoices" | "engineers" | "clients" | "jobs" | "trial_expired" | "schedule" | "timesheets"
): UpgradeSuggestion | null {
  const currentPlan = normalizePlan(plan);
  
  const suggestions: Record<string, UpgradeSuggestion> = {
    trial_expired: {
      reason: "Your trial has expired",
      currentPlan,
      suggestedPlan: "solo",
      benefit: "Continue using Quantract with 20 quotes and 15 invoices per month",
    },
    quotes: {
      reason: "You've reached your monthly quote limit",
      currentPlan,
      suggestedPlan: currentPlan === "trial" ? "solo" : currentPlan === "solo" ? "team" : "pro",
      benefit: currentPlan === "solo" ? "Get 100 quotes/month with Team" : "Get unlimited quotes with Pro",
    },
    invoices: {
      reason: "You've reached your monthly invoice limit",
      currentPlan,
      suggestedPlan: currentPlan === "trial" ? "solo" : currentPlan === "solo" ? "team" : "pro",
      benefit: currentPlan === "solo" ? "Get 75 invoices/month with Team" : "Get unlimited invoices with Pro",
    },
    engineers: {
      reason: "You've reached your engineer limit",
      currentPlan,
      suggestedPlan: currentPlan === "solo" ? "team" : "pro",
      benefit: currentPlan === "solo" ? "Add up to 5 engineers with Team" : "Add unlimited engineers with Pro",
    },
    clients: {
      reason: "You've reached your client limit",
      currentPlan,
      suggestedPlan: currentPlan === "trial" ? "solo" : currentPlan === "solo" ? "team" : "pro",
      benefit: "Add more clients to grow your business",
    },
    jobs: {
      reason: "You've reached your job limit",
      currentPlan,
      suggestedPlan: currentPlan === "trial" ? "solo" : currentPlan === "solo" ? "team" : "pro",
      benefit: "Create more jobs to manage your workload",
    },
    schedule: {
      reason: "Schedule is not available on your plan",
      currentPlan,
      suggestedPlan: "team",
      benefit: "Manage your team's schedule and assignments",
    },
    timesheets: {
      reason: "Timesheets are not available on your plan",
      currentPlan,
      suggestedPlan: "team",
      benefit: "Track time and improve job costing accuracy",
    },
  };

  return suggestions[limitType] || null;
}
