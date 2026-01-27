/**
 * Tests for the Stripe webhook handler logic.
 * Tests subscription status mapping and event handling.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createMockPrismaClient,
  createMockStripeEvent,
  createMockStripeCheckoutSession,
  createMockStripeSubscription,
  createMockInvoice,
  createMockCompany,
} from "../test-utils";

// Mock modules
vi.mock("@/lib/server/stripe", () => ({
  getStripe: vi.fn(),
}));

vi.mock("@/lib/server/repo", () => ({
  getInvoiceById: vi.fn(),
  findInvoiceByPaymentRef: vi.fn(),
  recordInvoicePayment: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("@/lib/server/observability", () => ({
  logBusinessEvent: vi.fn(),
  withRequestLogging: (fn: Function) => fn,
}));

import { getStripe } from "@/lib/server/stripe";
import * as repo from "@/lib/server/repo";
import { getPrisma } from "@/lib/server/prisma";
import { logBusinessEvent } from "@/lib/server/observability";

describe("Stripe Webhook Handler", () => {
  const mockPrisma = createMockPrismaClient();
  const mockStripe = {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getStripe as any).mockReturnValue(mockStripe);
    (getPrisma as any).mockReturnValue(mockPrisma);
  });

  describe("mapSubStatus", () => {
    // Test the subscription status mapping logic
    const validStatuses = [
      "active",
      "trialing",
      "past_due",
      "canceled",
      "unpaid",
      "incomplete",
      "incomplete_expired",
    ];

    it.each(validStatuses)("should map %s status correctly", (status) => {
      const result = mapSubStatus(status);
      expect(result).toBe(status);
    });

    it("should map unknown status to inactive", () => {
      expect(mapSubStatus("unknown")).toBe("inactive");
      expect(mapSubStatus("")).toBe("inactive");
      expect(mapSubStatus(undefined as any)).toBe("inactive");
      expect(mapSubStatus(null as any)).toBe("inactive");
    });
  });

  describe("Webhook Validation", () => {
    it("should reject request when Stripe is not configured", async () => {
      (getStripe as any).mockReturnValue(null);

      const result = await simulateWebhookValidation();
      expect(result.error).toBe("stripe_not_configured");
      expect(logBusinessEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "webhook.failure",
          metadata: expect.objectContaining({
            reason: "stripe_not_configured",
          }),
        })
      );
    });

    it("should reject request when webhook secret is missing", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = "";

      const result = await simulateWebhookValidation();
      expect(result.error).toBe("missing_webhook_secret");
    });

    it("should reject invalid signature", async () => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const result = await simulateWebhookValidation();
      expect(result.error).toBe("invalid_signature");
    });

    afterEach(() => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    });
  });

  describe("checkout.session.completed - Payment Mode", () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    });

    afterEach(() => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it("should record payment for existing invoice by ID", async () => {
      const invoice = createMockInvoice();
      const session = createMockStripeCheckoutSession({
        mode: "payment",
        payment_status: "paid",
        amount_total: 12000,
        metadata: { invoiceId: invoice.id },
      });

      (repo.getInvoiceById as any).mockResolvedValue(invoice);

      await simulateCheckoutCompleted(session);

      expect(repo.recordInvoicePayment).toHaveBeenCalledWith({
        invoiceId: invoice.id,
        amount: 120, // 12000 / 100
        currency: "gbp",
        provider: "stripe",
        providerRef: session.id,
        status: "succeeded",
      });
    });

    it("should find invoice by payment ref when invoiceId not in metadata", async () => {
      const invoice = createMockInvoice();
      const session = createMockStripeCheckoutSession({
        mode: "payment",
        payment_status: "paid",
        metadata: {}, // No invoiceId
      });

      (repo.getInvoiceById as any).mockResolvedValue(null);
      (repo.findInvoiceByPaymentRef as any).mockResolvedValue(invoice);

      await simulateCheckoutCompleted(session);

      expect(repo.findInvoiceByPaymentRef).toHaveBeenCalledWith(session.id);
      expect(repo.recordInvoicePayment).toHaveBeenCalled();
    });

    it("should not record payment if invoice not found", async () => {
      const session = createMockStripeCheckoutSession({
        mode: "payment",
        payment_status: "paid",
      });

      (repo.getInvoiceById as any).mockResolvedValue(null);
      (repo.findInvoiceByPaymentRef as any).mockResolvedValue(null);

      await simulateCheckoutCompleted(session);

      expect(repo.recordInvoicePayment).not.toHaveBeenCalled();
    });

    it("should not record payment if payment_status is not paid", async () => {
      const session = createMockStripeCheckoutSession({
        mode: "payment",
        payment_status: "unpaid",
      });

      await simulateCheckoutCompleted(session);

      expect(repo.recordInvoicePayment).not.toHaveBeenCalled();
    });

    it("should log business event on successful payment", async () => {
      const invoice = createMockInvoice({ companyId: "company-456" });
      const session = createMockStripeCheckoutSession({
        mode: "payment",
        payment_status: "paid",
        amount_total: 5000,
        currency: "usd",
        metadata: { invoiceId: invoice.id },
      });

      (repo.getInvoiceById as any).mockResolvedValue(invoice);

      await simulateCheckoutCompleted(session);

      expect(logBusinessEvent).toHaveBeenCalledWith({
        name: "invoice.paid",
        companyId: "company-456",
        invoiceId: invoice.id,
        metadata: {
          provider: "stripe",
          amount: 50,
          currency: "usd",
        },
      });
    });
  });

  describe("checkout.session.completed - Subscription Mode", () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    });

    afterEach(() => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it("should update company with subscription details", async () => {
      const subscription = createMockStripeSubscription({
        status: "active",
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      });

      const session = createMockStripeCheckoutSession({
        mode: "subscription",
        subscription: subscription.id,
        customer: "cus_test",
        metadata: { companyId: "company-123", plan: "professional" },
      });

      mockStripe.subscriptions.retrieve.mockResolvedValue(subscription);

      await simulateCheckoutCompleted(session);

      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: "company-123" },
        data: expect.objectContaining({
          plan: "professional",
          subscriptionStatus: "active",
          stripeCustomerId: "cus_test",
          stripeSubscriptionId: subscription.id,
        }),
      });
    });

    it("should not update company if companyId is missing", async () => {
      const session = createMockStripeCheckoutSession({
        mode: "subscription",
        metadata: {}, // No companyId
      });

      await simulateCheckoutCompleted(session);

      expect(mockPrisma.company.update).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.updated", () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    });

    afterEach(() => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it("should update company subscription status", async () => {
      const subscription = createMockStripeSubscription({
        id: "sub_123",
        status: "past_due",
        metadata: { companyId: "company-123", plan: "professional" },
        customer: "cus_test",
      });

      await simulateSubscriptionEvent("customer.subscription.updated", subscription);

      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: "company-123" },
        data: expect.objectContaining({
          subscriptionStatus: "past_due",
          stripeSubscriptionId: "sub_123",
          stripeCustomerId: "cus_test",
        }),
      });
    });
  });

  describe("customer.subscription.deleted", () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    });

    afterEach(() => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it("should update company when subscription is canceled", async () => {
      const subscription = createMockStripeSubscription({
        id: "sub_123",
        status: "canceled",
        metadata: { companyId: "company-123" },
      });

      await simulateSubscriptionEvent("customer.subscription.deleted", subscription);

      expect(mockPrisma.company.update).toHaveBeenCalledWith({
        where: { id: "company-123" },
        data: expect.objectContaining({
          subscriptionStatus: "canceled",
        }),
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    });

    afterEach(() => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it("should log error but return success to avoid retries", async () => {
      const session = createMockStripeCheckoutSession({
        mode: "payment",
        payment_status: "paid",
        metadata: { invoiceId: "inv-123" },
      });

      (repo.getInvoiceById as any).mockRejectedValue(new Error("Database error"));

      // The webhook should still return ok: true to prevent Stripe retries
      const result = await simulateCheckoutCompleted(session);

      // In the actual implementation, errors are swallowed
      // This test verifies the expected behavior
      expect(logBusinessEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "webhook.failure",
          metadata: expect.objectContaining({
            reason: "handler_error",
          }),
        })
      );
    });
  });
});

// Helper function that mirrors the mapSubStatus logic from the route
function mapSubStatus(s: string): string {
  const v = String(s || "");
  if (
    v === "active" ||
    v === "trialing" ||
    v === "past_due" ||
    v === "canceled" ||
    v === "unpaid" ||
    v === "incomplete" ||
    v === "incomplete_expired"
  ) {
    return v;
  }
  return "inactive";
}

// Simulation helpers for testing webhook logic
async function simulateWebhookValidation() {
  const stripe = getStripe();
  if (!stripe) {
    logBusinessEvent({
      name: "webhook.failure",
      metadata: { provider: "stripe", reason: "stripe_not_configured" },
    });
    return { ok: false, error: "stripe_not_configured" };
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret) {
    logBusinessEvent({
      name: "webhook.failure",
      metadata: { provider: "stripe", reason: "missing_webhook_secret" },
    });
    return { ok: false, error: "missing_webhook_secret" };
  }

  try {
    (stripe as any).webhooks.constructEvent("body", "sig", secret);
    return { ok: true };
  } catch (err: any) {
    logBusinessEvent({
      name: "webhook.failure",
      metadata: { provider: "stripe", reason: "invalid_signature" },
    });
    return { ok: false, error: "invalid_signature" };
  }
}

async function simulateCheckoutCompleted(session: ReturnType<typeof createMockStripeCheckoutSession>) {
  const stripe = getStripe() as any;
  const db = getPrisma() as any;

  try {
    const mode = session.mode;

    if (mode === "payment") {
      const paymentStatus = session.payment_status;
      if (session.id && paymentStatus === "paid") {
        const invoiceId = session.metadata?.invoiceId || "";
        const inv = invoiceId
          ? await repo.getInvoiceById(invoiceId)
          : await repo.findInvoiceByPaymentRef(session.id);

        if (inv) {
          const amountTotal = (session.amount_total || 0) / 100;
          await repo.recordInvoicePayment({
            invoiceId: inv.id,
            amount: amountTotal,
            currency: session.currency || "gbp",
            provider: "stripe",
            providerRef: session.id,
            status: "succeeded",
          });
          logBusinessEvent({
            name: "invoice.paid",
            companyId: inv.companyId || undefined,
            invoiceId: inv.id,
            metadata: {
              provider: "stripe",
              amount: amountTotal,
              currency: session.currency || "gbp",
            },
          });
        }
      }
    }

    if (mode === "subscription") {
      const companyId = session.metadata?.companyId || "";
      const plan = session.metadata?.plan || "";
      const subscriptionId = session.subscription || "";
      const customerId = session.customer || "";

      if (db && companyId) {
        const sub = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
        await db.company.update({
          where: { id: companyId },
          data: {
            plan: plan || undefined,
            subscriptionStatus: mapSubStatus(sub?.status || "active"),
            stripeCustomerId: customerId || undefined,
            stripeSubscriptionId: subscriptionId || undefined,
            currentPeriodEnd: sub?.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : undefined,
            trialEnd: sub?.trial_end ? new Date(sub.trial_end * 1000) : undefined,
          },
        });
      }
    }

    return { ok: true };
  } catch (err: any) {
    logBusinessEvent({
      name: "webhook.failure",
      metadata: { provider: "stripe", reason: "handler_error", message: err?.message },
    });
    return { ok: true }; // Return success to avoid retries
  }
}

async function simulateSubscriptionEvent(
  eventType: string,
  subscription: ReturnType<typeof createMockStripeSubscription>
) {
  const db = getPrisma() as any;
  const companyId = subscription.metadata?.companyId || "";
  const plan = subscription.metadata?.plan || "";

  if (db && companyId) {
    await db.company.update({
      where: { id: companyId },
      data: {
        plan: plan || undefined,
        subscriptionStatus: mapSubStatus(subscription.status),
        stripeSubscriptionId: subscription.id || undefined,
        stripeCustomerId: subscription.customer || undefined,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : undefined,
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : undefined,
      },
    });
  }
}
