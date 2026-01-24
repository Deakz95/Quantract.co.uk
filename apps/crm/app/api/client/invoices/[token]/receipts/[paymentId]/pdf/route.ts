import { NextResponse } from "next/server";
import * as repo from "@/lib/server/repo";
import { renderReceiptPdf } from "@/lib/server/pdf";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
export const runtime = "nodejs";

export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ token: string; paymentId: string }> }) {
    const { token, paymentId } = await getRouteParams(ctx);
    const invoice = await repo.getInvoiceByToken(token);
    if (!invoice) {
      return NextResponse.json({
        error: "not_found"
      }, {
        status: 404
      });
    }
    const summary = await repo.getInvoicePaymentSummary(invoice.id);
    const payment = summary?.payments.find(p => p.id === paymentId) || null;
    if (!payment) {
      return NextResponse.json({
        error: "not_found"
      }, {
        status: 404
      });
    }
    const brand = await repo.getBrandContextForInvoiceToken(token);
    const pdf = await renderReceiptPdf({
      invoice,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        status: payment.status,
        receivedAtISO: payment.receivedAtISO
      },
      brand
    });
    return new NextResponse(pdf, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename=receipt-${payment.id}.pdf`
      }
    });
  }
);
