/**
 * Server-side entitlement guard.
 *
 * Use this in API routes to block requests when the company
 * doesn't have a required entitlement.
 *
 * Usage:
 *   const entitlements = await requireEntitlement("feature_custom_domain");
 *   // If we get here, the company has the entitlement
 */

import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { computeEntitlements, hasEntitlement, getUnlockingPlan, getPlanLabel, type EntitlementKey, type Entitlements } from "@/lib/entitlements";
import { type Module } from "@/lib/billing/plans";

export class EntitlementError extends Error {
  status: number;
  entitlementKey: EntitlementKey;
  requiredPlan: string;

  constructor(key: EntitlementKey, requiredPlan: string) {
    super(`Entitlement required: ${key} (requires ${requiredPlan})`);
    this.name = "EntitlementError";
    this.status = 403;
    this.entitlementKey = key;
    this.requiredPlan = requiredPlan;
  }
}

/**
 * Require a specific entitlement.
 * Throws EntitlementError (403) if not met.
 * Returns the full entitlements object if successful.
 */
export async function requireEntitlement(key: EntitlementKey): Promise<Entitlements> {
  const authCtx = await requireCompanyContext();
  const prisma = getPrisma();

  if (!prisma) {
    const err: any = new Error("Service unavailable");
    err.status = 503;
    throw err;
  }

  // Fetch company with billing relation
  const company = await prisma.company.findUnique({
    where: { id: authCtx.companyId },
    select: {
      plan: true,
      trialStartedAt: true,
      billing: {
        select: {
          plan: true,
          enabledModules: true,
          extraUsers: true,
          extraEntities: true,
          extraStorageMB: true,
          trialStartedAt: true,
        },
      },
    },
  });

  if (!company) {
    const err: any = new Error("Company not found");
    err.status = 404;
    throw err;
  }

  // Use billing table if exists, fallback to company fields
  const billing = company.billing;
  const entitlements = computeEntitlements(billing?.plan || company.plan, {
    overrideEmail: authCtx.email,
    enabledModules: (billing?.enabledModules as Module[]) || [],
    extraUsers: billing?.extraUsers || 0,
    extraEntities: billing?.extraEntities || 0,
    extraStorageMB: billing?.extraStorageMB || 0,
    trialStartedAt: billing?.trialStartedAt || company.trialStartedAt,
  });

  if (!hasEntitlement(entitlements, key)) {
    const unlockingPlan = getUnlockingPlan(key);
    throw new EntitlementError(key, getPlanLabel(unlockingPlan));
  }

  return entitlements;
}

/**
 * Get entitlements for the current company without requiring a specific one.
 * Useful when you need to check multiple entitlements.
 */
export async function getCompanyEntitlements(): Promise<Entitlements> {
  const authCtx = await requireCompanyContext();
  const prisma = getPrisma();

  if (!prisma) {
    const err: any = new Error("Service unavailable");
    err.status = 503;
    throw err;
  }

  // Fetch company with billing relation
  const company = await prisma.company.findUnique({
    where: { id: authCtx.companyId },
    select: {
      plan: true,
      trialStartedAt: true,
      billing: {
        select: {
          plan: true,
          enabledModules: true,
          extraUsers: true,
          extraEntities: true,
          extraStorageMB: true,
          trialStartedAt: true,
        },
      },
    },
  });

  if (!company) {
    const err: any = new Error("Company not found");
    err.status = 404;
    throw err;
  }

  // Use billing table if exists, fallback to company fields
  const billing = company.billing;
  return computeEntitlements(billing?.plan || company.plan, {
    overrideEmail: authCtx.email,
    enabledModules: (billing?.enabledModules as Module[]) || [],
    extraUsers: billing?.extraUsers || 0,
    extraEntities: billing?.extraEntities || 0,
    extraStorageMB: billing?.extraStorageMB || 0,
    trialStartedAt: billing?.trialStartedAt || company.trialStartedAt,
  });
}
