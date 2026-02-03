/**
 * Billing Catalog - Maps Stripe Price IDs to Plan/Module/Add-on definitions
 *
 * This file defines the relationship between Stripe products/prices and
 * internal plan tiers, modules, and add-ons.
 *
 * Environment variables:
 * - STRIPE_PRICE_CORE_MONTHLY
 * - STRIPE_PRICE_PRO_MONTHLY
 * - STRIPE_PRICE_PRO_PLUS_MONTHLY
 * - STRIPE_PRICE_MODULE_CRM
 * - STRIPE_PRICE_MODULE_CERTIFICATES
 * - STRIPE_PRICE_MODULE_PORTAL
 * - STRIPE_PRICE_MODULE_TOOLS
 * - STRIPE_PRICE_EXTRA_USER
 * - STRIPE_PRICE_EXTRA_ENTITY
 * - STRIPE_PRICE_EXTRA_STORAGE
 */

import { type PlanTier, type Module } from "./plans";

// ============================================================================
// Plan Catalog
// ============================================================================

export type PlanCatalogEntry = {
  id: PlanTier;
  label: string;
  priceEnvKey: string;
  monthlyPrice: number; // GBP
};

export const PLAN_CATALOG: Record<Exclude<PlanTier, "trial" | "enterprise">, PlanCatalogEntry> = {
  core: {
    id: "core",
    label: "Core",
    priceEnvKey: "STRIPE_PRICE_CORE_MONTHLY",
    monthlyPrice: 19,
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceEnvKey: "STRIPE_PRICE_PRO_MONTHLY",
    monthlyPrice: 79,
  },
  pro_plus: {
    id: "pro_plus",
    label: "Pro Plus",
    priceEnvKey: "STRIPE_PRICE_PRO_PLUS_MONTHLY",
    monthlyPrice: 149,
  },
};

// ============================================================================
// Module Catalog
// ============================================================================

export type ModuleCatalogEntry = {
  id: Module;
  label: string;
  priceEnvKey: string;
  monthlyPrice: number; // GBP
};

export const MODULE_CATALOG: Record<Module, ModuleCatalogEntry> = {
  crm: {
    id: "crm",
    label: "CRM Module",
    priceEnvKey: "STRIPE_PRICE_MODULE_CRM",
    monthlyPrice: 19,
  },
  certificates: {
    id: "certificates",
    label: "Certificates Module",
    priceEnvKey: "STRIPE_PRICE_MODULE_CERTIFICATES",
    monthlyPrice: 15,
  },
  portal: {
    id: "portal",
    label: "Customer Portal",
    priceEnvKey: "STRIPE_PRICE_MODULE_PORTAL",
    monthlyPrice: 7,
  },
  tools: {
    id: "tools",
    label: "Tools Pack",
    priceEnvKey: "STRIPE_PRICE_MODULE_TOOLS",
    monthlyPrice: 7,
  },
};

// ============================================================================
// Add-on Catalog
// ============================================================================

export type AddOnType = "extra_user" | "extra_entity" | "extra_storage";

export type AddOnCatalogEntry = {
  id: AddOnType;
  label: string;
  priceEnvKey: string;
  unitPrice: number; // GBP per unit per month
  unit: string; // e.g., "user", "entity", "50GB"
};

export const ADDON_CATALOG: Record<AddOnType, AddOnCatalogEntry> = {
  extra_user: {
    id: "extra_user",
    label: "Extra User",
    priceEnvKey: "STRIPE_PRICE_EXTRA_USER",
    unitPrice: 4,
    unit: "user",
  },
  extra_entity: {
    id: "extra_entity",
    label: "Extra Legal Entity",
    priceEnvKey: "STRIPE_PRICE_EXTRA_ENTITY",
    unitPrice: 15,
    unit: "entity",
  },
  extra_storage: {
    id: "extra_storage",
    label: "Extra Storage",
    priceEnvKey: "STRIPE_PRICE_EXTRA_STORAGE",
    unitPrice: 5,
    unit: "50GB",
  },
};

// ============================================================================
// Price ID Helpers
// ============================================================================

/**
 * Get the Stripe price ID for a plan tier.
 */
export function getPlanPriceId(plan: PlanTier): string | null {
  if (plan === "trial" || plan === "enterprise") return null;
  const entry = PLAN_CATALOG[plan];
  if (!entry) return null;
  return process.env[entry.priceEnvKey] || null;
}

/**
 * Get the Stripe price ID for a module.
 */
export function getModulePriceId(module: Module): string | null {
  const entry = MODULE_CATALOG[module];
  if (!entry) return null;
  return process.env[entry.priceEnvKey] || null;
}

/**
 * Get the Stripe price ID for an add-on.
 */
export function getAddOnPriceId(addOn: AddOnType): string | null {
  const entry = ADDON_CATALOG[addOn];
  if (!entry) return null;
  return process.env[entry.priceEnvKey] || null;
}

/**
 * Build a reverse lookup map from Stripe price IDs to catalog entries.
 * Call this once and cache the result.
 */
export function buildPriceIdLookup(): {
  plans: Map<string, PlanTier>;
  modules: Map<string, Module>;
  addOns: Map<string, AddOnType>;
} {
  const plans = new Map<string, PlanTier>();
  const modules = new Map<string, Module>();
  const addOns = new Map<string, AddOnType>();

  // Plans
  for (const [planId, entry] of Object.entries(PLAN_CATALOG)) {
    const priceId = process.env[entry.priceEnvKey];
    if (priceId) {
      plans.set(priceId, planId as PlanTier);
    }
  }

  // Modules
  for (const [moduleId, entry] of Object.entries(MODULE_CATALOG)) {
    const priceId = process.env[entry.priceEnvKey];
    if (priceId) {
      modules.set(priceId, moduleId as Module);
    }
  }

  // Add-ons
  for (const [addOnId, entry] of Object.entries(ADDON_CATALOG)) {
    const priceId = process.env[entry.priceEnvKey];
    if (priceId) {
      addOns.set(priceId, addOnId as AddOnType);
    }
  }

  return { plans, modules, addOns };
}

/**
 * Validate that all required Stripe price IDs are configured.
 * Logs warnings for missing IDs.
 */
export function validateCatalogConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const entry of Object.values(PLAN_CATALOG)) {
    if (!process.env[entry.priceEnvKey]) {
      missing.push(`${entry.priceEnvKey} (${entry.label})`);
    }
  }

  for (const entry of Object.values(MODULE_CATALOG)) {
    if (!process.env[entry.priceEnvKey]) {
      missing.push(`${entry.priceEnvKey} (${entry.label})`);
    }
  }

  for (const entry of Object.values(ADDON_CATALOG)) {
    if (!process.env[entry.priceEnvKey]) {
      missing.push(`${entry.priceEnvKey} (${entry.label})`);
    }
  }

  if (missing.length > 0) {
    console.warn("[billing/catalog] Missing Stripe price IDs:", missing);
  }

  return { valid: missing.length === 0, missing };
}
