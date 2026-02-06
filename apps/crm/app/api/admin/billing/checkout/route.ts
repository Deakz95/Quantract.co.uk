import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getStripe, appBaseUrl } from "@/lib/server/stripe";
import { withRequestLogging } from "@/lib/server/observability";
import {
  getPlanPriceId,
  getModulePriceId,
  getAddOnPriceId,
  type AddOnType,
} from "@/lib/billing/catalog";
import { type Module } from "@/lib/billing/plans";
import { z } from "zod";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  plan: z.enum(["core", "pro", "pro_plus"]),
  modules: z
    .array(z.enum(["crm", "certificates", "portal", "tools"]))
    .optional()
    .default([]),
  addOns: z
    .array(
      z.object({
        type: z.enum(["extra_user", "extra_entity", "extra_storage"]),
        quantity: z.number().int().min(1),
      })
    )
    .optional()
    .default([]),
});

export const POST = withRequestLogging(async function POST(req: Request) {
  const authCtx = await requireCompanyContext();
  const effectiveRole = getEffectiveRole(authCtx);
  if (effectiveRole !== "admin") {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { plan, modules, addOns } = parsed.data;
  const companyId = authCtx.companyId;
  const client = getPrisma();
  const stripe = getStripe();

  if (!client || !stripe) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 400 }
    );
  }

  // Build line items from catalog
  const lineItems: { price: string; quantity: number }[] = [];

  // 1. Plan price
  const planPriceId = getPlanPriceId(plan);
  if (!planPriceId) {
    return NextResponse.json(
      { ok: false, error: "missing_price_id", item: plan },
      { status: 400 }
    );
  }
  lineItems.push({ price: planPriceId, quantity: 1 });

  // 2. Module prices (only meaningful for core plan — pro/pro_plus include all)
  for (const mod of modules) {
    const modPriceId = getModulePriceId(mod as Module);
    if (!modPriceId) {
      return NextResponse.json(
        { ok: false, error: "missing_price_id", item: `module_${mod}` },
        { status: 400 }
      );
    }
    lineItems.push({ price: modPriceId, quantity: 1 });
  }

  // 3. Add-on prices
  for (const addOn of addOns) {
    const addOnPriceId = getAddOnPriceId(addOn.type as AddOnType);
    if (!addOnPriceId) {
      return NextResponse.json(
        { ok: false, error: "missing_price_id", item: `addon_${addOn.type}` },
        { status: 400 }
      );
    }
    lineItems.push({ price: addOnPriceId, quantity: addOn.quantity });
  }

  // Ensure CompanyBilling record exists
  const company = await client.company.findUnique({
    where: { id: companyId },
    select: { name: true, stripeCustomerId: true, billing: { select: { id: true } } },
  });
  if (!company) {
    return NextResponse.json(
      { ok: false, error: "company_not_found" },
      { status: 404 }
    );
  }

  // Create or reuse Stripe customer
  let customerId = company.stripeCustomerId || null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name,
      metadata: { companyId },
    });
    customerId = customer.id;
    await client.company.update({
      where: { id: companyId },
      data: { stripeCustomerId: customerId },
    });
  }

  // Ensure CompanyBilling record exists
  if (!company.billing) {
    await client.companyBilling.create({
      data: {
        companyId,
        stripeCustomerId: customerId,
        plan: "trial",
        subscriptionStatus: "inactive",
      },
    });
  } else {
    // Update stripeCustomerId if missing on billing record
    await client.companyBilling.update({
      where: { companyId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: lineItems,
    allow_promotion_codes: true,
    success_url: `${appBaseUrl()}/admin/billing?success=1`,
    cancel_url: `${appBaseUrl()}/admin/billing?canceled=1`,
    subscription_data: {
      metadata: {
        companyId,
        plan,
        modules: modules.join(","),
      },
    },
    metadata: {
      companyId,
      plan,
    },
  });

  return NextResponse.json({ ok: true, url: session.url });
});
