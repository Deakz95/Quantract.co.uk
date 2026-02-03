import { NextResponse } from "next/server";
import { getStripe } from "@/lib/server/stripe";
import * as repo from "@/lib/server/repo";
import { getPrisma } from "@/lib/server/prisma";
import { logBusinessEvent, withRequestLogging } from "@/lib/server/observability";
import {
  syncSubscriptionToBilling,
  handlePaymentFailed,
  refreshAndSyncSubscription,
} from "@/lib/server/billing/syncSubscription";
import type Stripe from "stripe";

export const runtime = "nodejs";

function mapSubStatus(s: string) {
  const v = String(s || "");
  if (v === "active" || v === "trialing" || v === "past_due" || v === "canceled" || v === "unpaid" || v === "incomplete" || v === "incomplete_expired") return v;
  return "inactive";
}

/**
 * Extract companyId from subscription or customer metadata.
 */
function getCompanyIdFromSubscription(sub: Stripe.Subscription): string | null {
  // First check subscription metadata
  const fromSub = sub.metadata?.companyId;
  if (fromSub) return String(fromSub);

  // Then check customer metadata if customer is expanded and not deleted
  if (
    typeof sub.customer === "object" &&
    sub.customer &&
    "metadata" in sub.customer &&
    sub.customer.metadata?.companyId
  ) {
    return String(sub.customer.metadata.companyId);
  }

  return null;
}
export const POST = withRequestLogging(async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    logBusinessEvent({
      name: "webhook.failure",
      metadata: {
        provider: "stripe",
        reason: "stripe_not_configured"
      }
    });
    return NextResponse.json({
      ok: false,
      error: "stripe_not_configured"
    }, {
      status: 400
    });
  }
  const sig = req.headers.get("stripe-signature") || "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret) {
    logBusinessEvent({
      name: "webhook.failure",
      metadata: {
        provider: "stripe",
        reason: "missing_webhook_secret"
      }
    });
    return NextResponse.json({
      ok: false,
      error: "missing_webhook_secret"
    }, {
      status: 400
    });
  }
  const rawBody = await req.text();
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    logBusinessEvent({
      name: "webhook.failure",
      metadata: {
        provider: "stripe",
        reason: "invalid_signature",
        message: err?.message
      }
    });
    return NextResponse.json({
      ok: false,
      error: "invalid_signature",
      message: err?.message
    }, {
      status: 400
    });
  }
  try {
    const eventId = event.id;

    // ----- Invoice payment (existing) -----
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const sessionId = String(session?.id || "");
      const mode = String(session?.mode || "");
      if (mode === "payment") {
        const paymentStatus = String(session?.payment_status || "");
        if (sessionId && paymentStatus === "paid") {
          const invoiceId = String(session?.metadata?.invoiceId || "");
          const inv = invoiceId ? await repo.getInvoiceById(invoiceId) : await repo.findInvoiceByPaymentRef(sessionId);
          if (inv) {
            // Deduplicate: skip if this session was already recorded
            const existingSummary = await repo.getInvoicePaymentSummary(inv.id);
            const alreadyRecorded = existingSummary?.payments?.some(
              (p: any) => p.providerRef === sessionId
            );
            if (alreadyRecorded) {
              return NextResponse.json({ ok: true });
            }
            const amountTotal = Number(session?.amount_total || 0) / 100;
            await repo.recordInvoicePayment({
              invoiceId: inv.id,
              amount: amountTotal,
              currency: String(session?.currency || "gbp"),
              provider: "stripe",
              providerRef: sessionId,
              status: "succeeded"
            });
            logBusinessEvent({
              name: "invoice.paid",
              companyId: inv.companyId || undefined,
              invoiceId: inv.id,
              metadata: {
                provider: "stripe",
                amount: amountTotal,
                currency: String(session?.currency || "gbp")
              }
            });
          }
        }
      }

      // ----- SaaS subscription checkout -----
      if (mode === "subscription") {
        const companyId = String(session?.metadata?.companyId || "");
        const subscriptionId = String(session?.subscription || "");

        if (companyId && subscriptionId) {
          // Use new sync logic
          const result = await refreshAndSyncSubscription(stripe, subscriptionId, companyId, eventId);
          if (result.success) {
            logBusinessEvent({
              name: "subscription.created",
              companyId,
              metadata: { subscriptionId, via: "checkout" }
            });
          }
        }
      }
    }

    // ----- Subscription created -----
    if (event.type === "customer.subscription.created") {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = getCompanyIdFromSubscription(sub);

      if (companyId) {
        const result = await syncSubscriptionToBilling(companyId, sub, eventId);
        if (result.success && !result.skipped) {
          logBusinessEvent({
            name: "subscription.created",
            companyId,
            metadata: { subscriptionId: sub.id }
          });
        }
      }
    }

    // ----- Subscription updated -----
    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = getCompanyIdFromSubscription(sub);

      if (companyId) {
        const result = await syncSubscriptionToBilling(companyId, sub, eventId);
        if (result.success && !result.skipped) {
          logBusinessEvent({
            name: "subscription.updated",
            companyId,
            metadata: { subscriptionId: sub.id, status: sub.status }
          });
        }
      }
    }

    // ----- Subscription deleted -----
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = getCompanyIdFromSubscription(sub);

      if (companyId) {
        const result = await syncSubscriptionToBilling(companyId, sub, eventId);
        if (result.success && !result.skipped) {
          logBusinessEvent({
            name: "subscription.deleted",
            companyId,
            metadata: { subscriptionId: sub.id }
          });
        }
      }
    }

    // ----- Invoice paid (refresh subscription state) -----
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;

      // Only process subscription invoices
      if (subscriptionId && invoice.billing_reason !== "manual") {
        // Try to get companyId from subscription metadata or customer
        const companyId = String(invoice.subscription_details?.metadata?.companyId || "")
          || String((invoice.customer as any)?.metadata?.companyId || "");

        if (companyId) {
          const result = await refreshAndSyncSubscription(stripe, subscriptionId, companyId, eventId);
          if (result.success && !result.skipped) {
            logBusinessEvent({
              name: "subscription.invoice_paid",
              companyId,
              metadata: { subscriptionId, invoiceId: invoice.id }
            });
          }
        }
      }
    }

    // ----- Invoice payment failed -----
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;

      if (subscriptionId) {
        const companyId = String(invoice.subscription_details?.metadata?.companyId || "")
          || String((invoice.customer as any)?.metadata?.companyId || "");

        if (companyId) {
          const result = await handlePaymentFailed(companyId, eventId);
          if (result.success && !result.skipped) {
            logBusinessEvent({
              name: "subscription.payment_failed",
              companyId,
              metadata: { subscriptionId, invoiceId: invoice.id }
            });
          }
        }
      }
    }
  } catch (err: any) {
    logBusinessEvent({
      name: "webhook.failure",
      metadata: {
        provider: "stripe",
        reason: "handler_error",
        message: err?.message
      }
    });
    // swallow errors to avoid repeated retries; inspect logs in prod.
  }
  return NextResponse.json({
    ok: true
  });
});
