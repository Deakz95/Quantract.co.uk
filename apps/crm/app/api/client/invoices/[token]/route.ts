import { NextResponse } from "next/server";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await getRouteParams(ctx);
  const invoice = await repo.getInvoiceByToken(token);
  if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (invoice.status === "draft") return NextResponse.json({ error: "not_found" }, { status: 404 });
  await repo.recordAuditEvent({
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.viewed",
    actorRole: "client",
    actor: invoice.clientEmail,
    meta: { token },
  });
  const attachments = await repo.listInvoiceAttachments(invoice.id);
  const paymentSummary = await repo.getInvoicePaymentSummary(invoice.id);

  // Fetch line items from linked quote if available
  let lineItems: Array<{ description?: string; qty: number; unitPrice: number }> | undefined;
  let vatRate = 0.2;
  if (invoice.quoteId) {
    const quote = await repo.getQuoteById(invoice.quoteId);
    if (quote) {
      lineItems = (quote.items || []).map((it: any) => ({
        description: it.description || "",
        qty: Number(it.qty || it.quantity || 0),
        unitPrice: Number(it.unitPrice || 0),
      }));
      vatRate = quote.vatRate ?? 0.2;
    }
  }

  return NextResponse.json({ invoice: { ...invoice, attachments }, paymentSummary, lineItems, vatRate });
}
