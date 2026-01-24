import { NextResponse } from "next/server";
import { requireRoles, getCompanyId } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { sendInvoiceEmail, absoluteUrl } from "@/lib/server/email";
import { logCriticalAction } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export async function POST(_req: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const companyId = await getCompanyId();
  const { invoiceId } = await getRouteParams(ctx);
  let invoice = await repo.getInvoiceById(invoiceId);
  if (!invoice) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (!invoice.paymentUrl) {
    const withLink = await repo.createPaymentLinkForInvoice(invoice.id);
    if (withLink) invoice = withLink;
  }

  const clientLink = `/client/invoices/${invoice.token}`;
  const delivery = await sendInvoiceEmail({
    companyId: companyId || undefined,
    to: invoice.clientEmail,
    clientName: invoice.clientName,
    invoiceId: invoice.id,
    shareLink: absoluteUrl(clientLink),
    totals: { subtotal: invoice.subtotal, vat: invoice.vat, total: invoice.total },
    payLink: invoice.paymentUrl ? absoluteUrl(invoice.paymentUrl) : undefined,
  });

  await repo.markInvoiceSent(invoice.id);

  logCriticalAction({
    name: "invoice.sent",
    companyId,
    metadata: {
      invoiceId: invoice.id,
      clientEmail: invoice.clientEmail,
      total: invoice.total,
      shareLink: absoluteUrl(clientLink),
    },
  });

  return NextResponse.json({ ok: true, delivery, clientLink });
}
