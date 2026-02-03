import { NextResponse } from "next/server";
import { requireRole, getCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getStripe, appBaseUrl } from "@/lib/server/stripe";
import { withRequestLogging } from "@/lib/server/observability";
export const runtime = "nodejs";
const PRICE_ENV: Record<string, string> = {
  // Legacy plan names (backward compatibility)
  solo: "STRIPE_PRICE_SOLO",
  team: "STRIPE_PRICE_TEAM",
  // New plan names
  core: "STRIPE_PRICE_CORE_MONTHLY",
  pro: "STRIPE_PRICE_PRO_MONTHLY",
  pro_plus: "STRIPE_PRICE_PRO_PLUS_MONTHLY",
};
export const POST = withRequestLogging(async function POST(req: Request) {
  await requireRole("admin");
  const body = (await req.json().catch(() => null)) as any;
  const plan = String(body?.plan || "");
  if (!PRICE_ENV[plan]) return NextResponse.json({
    ok: false,
    error: "invalid_plan"
  }, {
    status: 400
  });
  const companyId = await getCompanyId();
  const client = getPrisma();
  const stripe = getStripe();
  if (!client || !stripe || !companyId) return NextResponse.json({
    ok: false,
    error: "not_configured"
  }, {
    status: 400
  });
  const company = await client.company.findUnique({
    where: {
      id: companyId
    }
  });
  if (!company) return NextResponse.json({
    ok: false,
    error: "company_not_found"
  }, {
    status: 404
  });
  const priceId = process.env[PRICE_ENV[plan]] || "";
  if (!priceId) return NextResponse.json({
    ok: false,
    error: "missing_price_id"
  }, {
    status: 400
  });
  let customerId = company.stripeCustomerId || null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name,
      metadata: {
        companyId
      }
    });
    customerId = customer.id;
    await client.company.update({
      where: {
        id: companyId
      },
      data: {
        stripeCustomerId: customerId
      }
    });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{
      price: priceId,
      quantity: 1
    }],
    allow_promotion_codes: true,
    success_url: `${appBaseUrl()}/admin/billing?success=1`,
    cancel_url: `${appBaseUrl()}/admin/billing?canceled=1`,
    subscription_data: {
      metadata: {
        companyId,
        plan
      }
    },
    metadata: {
      companyId,
      plan
    }
  });
  return NextResponse.json({
    ok: true,
    url: session.url
  });
});
