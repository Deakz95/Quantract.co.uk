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
  return NextResponse.json({ invoice: { ...invoice, attachments }, paymentSummary });
}
