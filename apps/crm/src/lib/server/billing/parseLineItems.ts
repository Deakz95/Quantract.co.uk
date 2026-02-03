/**
 * Stripe Line Item Parsing
 *
 * Parses Stripe subscription line items to extract:
 * - Plan tier (core, pro, pro_plus)
 * - Enabled modules (crm, certificates, portal, tools)
 * - Add-on quantities (extra users, entities, storage)
 */

import type Stripe from "stripe";
import { type PlanTier, type Module } from "@/lib/billing/plans";
import { buildPriceIdLookup, type AddOnType } from "@/lib/billing/catalog";

export type ParsedSubscription = {
  plan: PlanTier;
  modules: Module[];
  extraUsers: number;
  extraEntities: number;
  extraStorageMB: number;
};

// Build lookup once
let cachedLookup: ReturnType<typeof buildPriceIdLookup> | null = null;

function getLookup() {
  if (!cachedLookup) {
    cachedLookup = buildPriceIdLookup();
  }
  return cachedLookup;
}

/**
 * Parse a Stripe subscription's line items to determine plan, modules, and add-ons.
 */
export function parseSubscriptionLineItems(
  items: Stripe.SubscriptionItem[] | Stripe.LineItem[]
): ParsedSubscription {
  const lookup = getLookup();

  let plan: PlanTier = "trial"; // Default if no plan found
  const modules: Module[] = [];
  let extraUsers = 0;
  let extraEntities = 0;
  let extraStorageMB = 0;

  for (const item of items) {
    // Get price ID from the item
    const priceId = typeof item.price === "string" ? item.price : item.price?.id;
    if (!priceId) continue;

    const quantity = item.quantity || 1;

    // Check if it's a plan
    const planTier = lookup.plans.get(priceId);
    if (planTier) {
      plan = planTier;
      continue;
    }

    // Check if it's a module
    const moduleId = lookup.modules.get(priceId);
    if (moduleId && !modules.includes(moduleId)) {
      modules.push(moduleId);
      continue;
    }

    // Check if it's an add-on
    const addOnType = lookup.addOns.get(priceId);
    if (addOnType) {
      switch (addOnType) {
        case "extra_user":
          extraUsers += quantity;
          break;
        case "extra_entity":
          extraEntities += quantity;
          break;
        case "extra_storage":
          // Each unit is 50GB
          extraStorageMB += quantity * 50 * 1024;
          break;
      }
      continue;
    }

    // Unknown price ID - log for debugging
    console.warn(`[parseLineItems] Unknown price ID: ${priceId}`);
  }

  return {
    plan,
    modules,
    extraUsers,
    extraEntities,
    extraStorageMB,
  };
}

/**
 * Parse plan tier from subscription line items.
 */
export function parsePlanFromLineItems(
  items: Stripe.SubscriptionItem[] | Stripe.LineItem[]
): PlanTier {
  const lookup = getLookup();

  for (const item of items) {
    const priceId = typeof item.price === "string" ? item.price : item.price?.id;
    if (!priceId) continue;

    const planTier = lookup.plans.get(priceId);
    if (planTier) return planTier;
  }

  return "trial"; // Default if no plan found
}

/**
 * Parse enabled modules from subscription line items.
 */
export function parseModulesFromLineItems(
  items: Stripe.SubscriptionItem[] | Stripe.LineItem[]
): Module[] {
  const lookup = getLookup();
  const modules: Module[] = [];

  for (const item of items) {
    const priceId = typeof item.price === "string" ? item.price : item.price?.id;
    if (!priceId) continue;

    const moduleId = lookup.modules.get(priceId);
    if (moduleId && !modules.includes(moduleId)) {
      modules.push(moduleId);
    }
  }

  return modules;
}

/**
 * Parse add-on quantities from subscription line items.
 */
export function parseAddOnsFromLineItems(
  items: Stripe.SubscriptionItem[] | Stripe.LineItem[]
): { extraUsers: number; extraEntities: number; extraStorageMB: number } {
  const lookup = getLookup();
  let extraUsers = 0;
  let extraEntities = 0;
  let extraStorageMB = 0;

  for (const item of items) {
    const priceId = typeof item.price === "string" ? item.price : item.price?.id;
    if (!priceId) continue;

    const quantity = item.quantity || 1;
    const addOnType = lookup.addOns.get(priceId);

    if (addOnType) {
      switch (addOnType) {
        case "extra_user":
          extraUsers += quantity;
          break;
        case "extra_entity":
          extraEntities += quantity;
          break;
        case "extra_storage":
          extraStorageMB += quantity * 50 * 1024;
          break;
      }
    }
  }

  return { extraUsers, extraEntities, extraStorageMB };
}
