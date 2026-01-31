import { NextResponse } from "next/server";
import { requireRoles, requireCompanyContext } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";
import { getPrisma } from "@/lib/server/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export async function GET(_req: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { invoiceId } = await getRouteParams(ctx);
  const invoice = await repo.getInvoiceById(invoiceId);
  if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Include line items from linked quote if available
  let lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [];
  if (invoice.quoteId) {
    const client = getPrisma();
    if (client) {
      const quote = await client.quote.findUnique({
        where: { id: invoice.quoteId },
        select: { items: true },
      }).catch(() => null);
      if (quote?.items && Array.isArray(quote.items)) {
        lineItems = (quote.items as any[]).map((item: any) => {
          const qty = Number(item.quantity ?? item.qty ?? 1);
          const unit = Number(item.unitPrice ?? item.price ?? item.rate ?? 0);
          const raw = Number(item.total ?? item.amount ?? 0);
          return {
            description: item.description || item.name || "",
            quantity: qty,
            unitPrice: unit,
            total: raw > 0 ? raw : qty * unit,
          };
        });
      }
    }
  }

  return NextResponse.json({ invoice, lineItems });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { invoiceId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => ({}))) as any;
  const status = typeof body.status === "string" ? body.status : undefined;
  if (!status) return NextResponse.json({ error: "missing_status" }, { status: 400 });

  const invoice = await repo.updateInvoiceStatus(invoiceId, status as any);
  if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ invoice });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const { invoiceId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true, companyId: true } });
    if (!invoice || invoice.companyId !== authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.auditEvent.deleteMany({ where: { entityType: "invoice", entityId: invoiceId } });
      await tx.invoicePayment.deleteMany({ where: { invoiceId } });
      await tx.invoiceChase.deleteMany({ where: { invoiceId } });
      await tx.invoiceAttachment.deleteMany({ where: { invoiceId } });
      await tx.invoiceVariation.deleteMany({ where: { invoiceId } });
      await tx.invoice.delete({ where: { id: invoiceId } });
    });

    await repo.recordAuditEvent({
      entityType: "invoice" as any,
      entityId: invoiceId,
      action: "invoice.deleted" as any,
      actorRole: "admin",
      actor: authCtx.userId,
      meta: { companyId: authCtx.companyId },
    }).catch(() => {});

    return NextResponse.json({ ok: true, deleted: true });
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json({ ok: false, error: "cannot_delete", message: "Cannot delete this invoice because it has linked records. Remove them first." }, { status: 409 });
    }
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("DELETE /api/admin/invoices/[invoiceId] error:", e);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
}
