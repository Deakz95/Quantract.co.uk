import { NextResponse } from "next/server";
import * as repo from "@/lib/server/repo";
import { getStripe, appBaseUrl } from "@/lib/server/stripe";
import { logBusinessEvent, withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
export const runtime = "nodejs";
export const POST = withRequestLogging(
  async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await getRouteParams(ctx);
  const inv = await repo.getInvoiceByToken(token);
  if (!inv) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });
  const summary = await repo.getInvoicePaymentSummary(inv.id);
  const balanceDue = Number(summary?.balanceDue ?? inv.total);

  // Already paid
  if (inv.status === "paid" || balanceDue <= 0) {
    return NextResponse.json({
      ok: true,
      invoice: inv,
      paymentSummary: summary,
      balanceDue: 0
    });
  }
  let requested: number | null = null;
  try {
    const body = await req.json().catch(() => ({}) as any);
    if (typeof body?.amount === "number") requested = body.amount;
    if (typeof body?.amount === "string") requested = Number(body.amount);
  } catch {

    // ignore
  }
  const amount = Math.max(0.01, Math.min(Number.isFinite(requested as any) ? Number(requested) : balanceDue, balanceDue));
  const stripe = getStripe();
  if (!stripe) {
    if (process.env.QT_ALLOW_MANUAL_PAY === "true") {
      const paid = await repo.markInvoicePaidByToken(token);
      const newSummary = paid ? await repo.getInvoicePaymentSummary(paid.id) : summary;
      if (paid) {
        logBusinessEvent({
          name: "invoice.paid",
          companyId: paid.companyId || undefined,
          invoiceId: paid.id,
          metadata: {
            provider: "manual",
            amount: balanceDue
          }
        });
      }
      return NextResponse.json({
        ok: true,
        invoice: paid,
        paymentSummary: newSummary
      });
    }
    return NextResponse.json({
      ok: false,
      error: "stripe_not_configured"
    }, {
      status: 400
    });
  }
  const base = appBaseUrl();
  const successUrl = `${base}/client/invoices/${inv.token}?paid=1`;
  const cancelUrl = `${base}/client/invoices/${inv.token}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: "gbp",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: Math.round(amount * 100),
        product_data: {
          name: `Invoice ${inv.invoiceNumber || inv.id}`,
          description: inv.quoteId ? `Quote: ${inv.quoteId}` : undefined
        }
      }
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      invoiceId: inv.id,
      invoiceToken: inv.token
    }
  });

  // Track last session for convenience (webhook uses metadata.invoiceId first).
  await repo.setInvoicePaymentSession({
    invoiceId: inv.id,
    provider: "stripe",
    paymentUrl: session.url || "",
    paymentRef: session.id
  });
  return NextResponse.json({
    ok: true,
    invoice: inv,
    paymentSummary: summary,
    paymentUrl: session.url
  });
});
