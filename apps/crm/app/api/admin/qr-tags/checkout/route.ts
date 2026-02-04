import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getStripe, appBaseUrl } from "@/lib/server/stripe";
import { withRequestLogging } from "@/lib/server/observability";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const UNIT_PRICE_PENCE = Number(process.env.STRIPE_QR_PACK_UNIT_PRICE_PENCE || "50");

export const POST = withRequestLogging(
  async function POST(req: Request) {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "admin" && role !== "office") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const stripe = getStripe();
      if (!stripe) {
        return NextResponse.json({ ok: false, error: "stripe_not_configured" }, { status: 400 });
      }

      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const body = await req.json().catch(() => ({}));
      const qty = Number(body.qty);
      if (!qty || qty < 1 || qty > 500 || !Number.isInteger(qty)) {
        return NextResponse.json({ ok: false, error: "invalid_qty" }, { status: 400 });
      }

      const amountPence = qty * UNIT_PRICE_PENCE;
      const orderId = randomUUID();
      const base = appBaseUrl();

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "gbp",
              unit_amount: UNIT_PRICE_PENCE,
              product_data: {
                name: `QR Tag Pack (${qty} tags)`,
                description: `${qty} unique QR tags for certificate verification`,
              },
            },
            quantity: qty,
          },
        ],
        metadata: {
          companyId: authCtx.companyId,
          purchaseType: "qr_tags",
          qty: String(qty),
          orderId,
        },
        success_url: `${base}/admin/qr-tags?purchased=1`,
        cancel_url: `${base}/admin/qr-tags`,
      });

      // Create QrOrder row with status 'pending'
      await prisma.qrOrder.create({
        data: {
          id: orderId,
          companyId: authCtx.companyId,
          qty,
          stripeSessionId: session.id,
          amountPence,
          status: "pending",
        },
      });

      return NextResponse.json({ ok: true, url: session.url });
    } catch (e: any) {
      if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      console.error("POST /api/admin/qr-tags/checkout error:", e);
      return NextResponse.json({ ok: false, error: "checkout_failed" }, { status: 500 });
    }
  },
);
