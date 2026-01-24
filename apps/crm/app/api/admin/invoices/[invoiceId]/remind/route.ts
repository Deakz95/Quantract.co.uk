import { NextResponse } from "next/server";
import { requireRole, getCompanyId } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { sendInvoiceReminder, absoluteUrl } from "@/lib/server/email";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const POST = withRequestLogging(
  async function POST(_req: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
  await requireRole("admin");
  const companyId = await getCompanyId();
  const { invoiceId } = await getRouteParams(ctx);
  const invoice = await repo.getInvoiceById(invoiceId);
  if (!invoice) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });
  const summary = await repo.getInvoicePaymentSummary(invoice.id);
  const balanceDue = Number(summary?.balanceDue ?? invoice.total);
  const clientLink = `/client/invoices/${invoice.token}`;
  const delivery = await sendInvoiceReminder({
    companyId: companyId || undefined,
    to: invoice.clientEmail,
    clientName: invoice.clientName,
    invoiceId: invoice.id,
    shareLink: absoluteUrl(clientLink),
    totals: {
      subtotal: invoice.subtotal,
      vat: invoice.vat,
      total: invoice.total
    },
    balanceDue
  });
  return NextResponse.json({
    ok: true,
    delivery,
    clientLink,
    balanceDue
  });
});
