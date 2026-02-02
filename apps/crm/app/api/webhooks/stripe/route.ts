import { NextResponse } from "next/server";
import { getStripe } from "@/lib/server/stripe";
import * as repo from "@/lib/server/repo";
import { getPrisma } from "@/lib/server/prisma";
import { logBusinessEvent, withRequestLogging } from "@/lib/server/observability";
export const runtime = "nodejs";
function mapSubStatus(s: string) {
  const v = String(s || "");
  if (v === "active" || v === "trialing" || v === "past_due" || v === "canceled" || v === "unpaid" || v === "incomplete" || v === "incomplete_expired") return v;
  return "inactive";
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
        const plan = String(session?.metadata?.plan || "");
        const subscriptionId = String(session?.subscription || "");
        const customerId = String(session?.customer || "");
        const client = getPrisma();
        if (client && companyId) {
          const sub = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
          await client.company.update({
            where: {
              id: companyId
            },
            data: {
              plan: plan || undefined,
              subscriptionStatus: mapSubStatus(sub?.status || "active"),
              stripeCustomerId: customerId || undefined,
              stripeSubscriptionId: subscriptionId || undefined,
              currentPeriodEnd: sub?.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
              trialEnd: sub?.trial_end ? new Date(sub.trial_end * 1000) : undefined
            }
          });
        }
      }
    }

    // Subscription lifecycle updates
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as any;
      const companyId = String(sub?.metadata?.companyId || "");
      const plan = String(sub?.metadata?.plan || "");
      const client = getPrisma();
      if (client && companyId) {
        await client.company.update({
          where: {
            id: companyId
          },
          data: {
            plan: plan || undefined,
            subscriptionStatus: mapSubStatus(sub?.status),
            stripeSubscriptionId: String(sub?.id || "") || undefined,
            stripeCustomerId: String(sub?.customer || "") || undefined,
            currentPeriodEnd: sub?.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
            trialEnd: sub?.trial_end ? new Date(sub.trial_end * 1000) : undefined
          }
        });
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
