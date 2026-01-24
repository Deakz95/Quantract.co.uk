import { NextResponse } from "next/server";
import { requireRole, getCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getStripe, appBaseUrl } from "@/lib/server/stripe";
import { withRequestLogging } from "@/lib/server/observability";
export const runtime = "nodejs";
export const POST = withRequestLogging(async function POST() {
  await requireRole("admin");
  const companyId = await getCompanyId();
  const client = getPrisma();
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({
    ok: false,
    error: "stripe_not_configured"
  }, {
    status: 400
  });
  if (!client || !companyId) return NextResponse.json({
    ok: false,
    error: "missing_company"
  }, {
    status: 400
  });
  const company = await client.company.findUnique({
    where: {
      id: companyId
    }
  });
  if (!company?.stripeCustomerId) return NextResponse.json({
    ok: false,
    error: "missing_customer"
  }, {
    status: 400
  });
  const portal = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${appBaseUrl()}/admin/billing`
  });
  return NextResponse.json({
    ok: true,
    url: portal.url
  });
});
