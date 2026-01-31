/**
 * Feature flags for gating new features by company plan.
 *
 * Checks the company's plan string to determine which features are enabled.
 * All features are enabled for pro/enterprise; trial/core get a subset.
 */

export type FeatureFlag =
  | "maintenance_alerts"
  | "truck_inventory"
  | "ai_estimator_photo"
  | "portal_troubleshooter"
  | "remote_assist"
  | "lead_scoring"
  | "portal_timeline";

/** Features available on each plan tier */
const PLAN_FEATURES: Record<string, FeatureFlag[]> = {
  trial: ["portal_timeline", "portal_troubleshooter"],
  core: ["portal_timeline", "portal_troubleshooter", "lead_scoring", "maintenance_alerts"],
  pro: [
    "portal_timeline",
    "portal_troubleshooter",
    "lead_scoring",
    "maintenance_alerts",
    "truck_inventory",
    "ai_estimator_photo",
    "remote_assist",
  ],
  enterprise: [
    "portal_timeline",
    "portal_troubleshooter",
    "lead_scoring",
    "maintenance_alerts",
    "truck_inventory",
    "ai_estimator_photo",
    "remote_assist",
  ],
};

function normalizePlan(plan: string | null | undefined): string {
  const p = (plan ?? "trial").toLowerCase().trim();
  if (p.includes("enterprise")) return "enterprise";
  if (p.includes("pro")) return "pro";
  if (p.includes("core")) return "core";
  return "trial";
}

/**
 * Check if a feature is enabled for a given plan.
 */
export function isFeatureEnabled(plan: string | null | undefined, flag: FeatureFlag): boolean {
  const tier = normalizePlan(plan);
  return (PLAN_FEATURES[tier] ?? []).includes(flag);
}

/**
 * Get all enabled features for a plan.
 */
export function getEnabledFeatures(plan: string | null | undefined): FeatureFlag[] {
  const tier = normalizePlan(plan);
  return PLAN_FEATURES[tier] ?? [];
}
