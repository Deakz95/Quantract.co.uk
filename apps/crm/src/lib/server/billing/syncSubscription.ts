/**
 * Subscription Sync Logic
 *
 * Syncs Stripe subscription state to CompanyBilling table.
 * Also updates Company fields for backward compatibility.
 */

import type Stripe from "stripe";
import { getPrisma } from "@/lib/server/prisma";
import { parseSubscriptionLineItems } from "./parseLineItems";

export type SyncResult = {
  success: boolean;
  companyId: string | null;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

/**
 * Map Stripe subscription status to our internal status.
 */
function mapSubscriptionStatus(stripeStatus: string): string {
  const validStatuses = [
    "active",
    "trialing",
    "past_due",
    "canceled",
    "unpaid",
    "incomplete",
    "incomplete_expired",
    "paused",
  ];

  if (validStatuses.includes(stripeStatus)) {
    return stripeStatus;
  }

  return "inactive";
}

/**
 * Sync a Stripe subscription to the CompanyBilling table.
 *
 * This is the main function called by webhook handlers.
 * It parses the subscription, upserts CompanyBilling, and updates Company for backward compatibility.
 *
 * @param companyId - The company ID (from subscription metadata)
 * @param subscription - The Stripe subscription object
 * @param eventId - The Stripe event ID for idempotency
 */
export async function syncSubscriptionToBilling(
  companyId: string,
  subscription: Stripe.Subscription,
  eventId: string
): Promise<SyncResult> {
  if (!companyId) {
    return {
      success: false,
      companyId: null,
      reason: "missing_company_id",
    };
  }

  const prisma = getPrisma();
  if (!prisma) {
    return {
      success: false,
      companyId,
      error: "prisma_not_available",
    };
  }

  try {
    // Check idempotency - skip if we've already processed this event
    const existingBilling = await prisma.companyBilling.findUnique({
      where: { companyId },
      select: { lastWebhookEventId: true },
    });

    if (existingBilling?.lastWebhookEventId === eventId) {
      return {
        success: true,
        companyId,
        skipped: true,
        reason: "duplicate_event",
      };
    }

    // Parse subscription items
    const items = subscription.items?.data || [];
    const parsed = parseSubscriptionLineItems(items);

    const status = mapSubscriptionStatus(subscription.status);
    const now = new Date();

    // Build CompanyBilling data
    const billingData = {
      stripeCustomerId: typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id || null,
      stripeSubscriptionId: subscription.id,
      plan: parsed.plan,
      subscriptionStatus: status,
      currentPeriodStart: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : null,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      trialStartedAt: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      enabledModules: parsed.modules,
      extraUsers: parsed.extraUsers,
      extraEntities: parsed.extraEntities,
      extraStorageMB: parsed.extraStorageMB,
      lastWebhookEventId: eventId,
      lastWebhookAt: now,
      updatedAt: now,
    };

    // Upsert CompanyBilling
    await prisma.companyBilling.upsert({
      where: { companyId },
      update: billingData,
      create: {
        companyId,
        ...billingData,
      },
    });

    // Also update Company fields for backward compatibility
    await prisma.company.update({
      where: { id: companyId },
      data: {
        plan: parsed.plan,
        subscriptionStatus: status,
        stripeCustomerId: billingData.stripeCustomerId || undefined,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: billingData.currentPeriodEnd,
        trialEnd: billingData.trialEnd,
        trialStartedAt: billingData.trialStartedAt,
      },
    });

    return {
      success: true,
      companyId,
    };
  } catch (error: any) {
    console.error("[syncSubscriptionToBilling] Error:", error);
    return {
      success: false,
      companyId,
      error: error?.message || "unknown_error",
    };
  }
}

/**
 * Handle subscription deletion (canceled/expired).
 * Sets the subscription status appropriately but preserves the billing record.
 */
export async function handleSubscriptionDeleted(
  companyId: string,
  subscription: Stripe.Subscription,
  eventId: string
): Promise<SyncResult> {
  // For deleted subscriptions, we still sync the final state
  // The status will be "canceled" or similar
  return syncSubscriptionToBilling(companyId, subscription, eventId);
}

/**
 * Update subscription status to past_due when payment fails.
 */
export async function handlePaymentFailed(
  companyId: string,
  eventId: string
): Promise<SyncResult> {
  if (!companyId) {
    return {
      success: false,
      companyId: null,
      reason: "missing_company_id",
    };
  }

  const prisma = getPrisma();
  if (!prisma) {
    return {
      success: false,
      companyId,
      error: "prisma_not_available",
    };
  }

  try {
    const existingBilling = await prisma.companyBilling.findUnique({
      where: { companyId },
      select: { lastWebhookEventId: true },
    });

    if (existingBilling?.lastWebhookEventId === eventId) {
      return {
        success: true,
        companyId,
        skipped: true,
        reason: "duplicate_event",
      };
    }

    const now = new Date();

    // Update billing status
    await prisma.companyBilling.update({
      where: { companyId },
      data: {
        subscriptionStatus: "past_due",
        lastWebhookEventId: eventId,
        lastWebhookAt: now,
        updatedAt: now,
      },
    });

    // Also update Company for backward compatibility
    await prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionStatus: "past_due",
      },
    });

    return {
      success: true,
      companyId,
    };
  } catch (error: any) {
    console.error("[handlePaymentFailed] Error:", error);
    return {
      success: false,
      companyId,
      error: error?.message || "unknown_error",
    };
  }
}

/**
 * Refresh subscription from Stripe and sync.
 * Used after invoice.paid to get the latest subscription state.
 */
export async function refreshAndSyncSubscription(
  stripe: Stripe,
  subscriptionId: string,
  companyId: string,
  eventId: string
): Promise<SyncResult> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });

    return syncSubscriptionToBilling(companyId, subscription, eventId);
  } catch (error: any) {
    console.error("[refreshAndSyncSubscription] Error:", error);
    return {
      success: false,
      companyId,
      error: error?.message || "unknown_error",
    };
  }
}
