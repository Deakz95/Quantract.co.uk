import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";
import { getPrisma } from "@/lib/server/prisma";

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
