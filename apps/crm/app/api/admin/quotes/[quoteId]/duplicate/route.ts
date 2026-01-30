import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const POST = withRequestLogging(async function POST(_req: Request, ctx: { params: Promise<{ quoteId: string }> }) {
  await requireRole("admin");
  const { quoteId } = await getRouteParams(ctx);

  const original = await repo.getQuoteById(quoteId);
  if (!original) {
    return NextResponse.json({ ok: false, error: "quote_not_found" }, { status: 404 });
  }

  const duplicate = await repo.createQuote({
    clientName: original.clientName,
    clientEmail: original.clientEmail,
    clientId: (original as any).clientId ?? undefined,
    siteId: (original as any).siteId ?? undefined,
    siteAddress: original.siteAddress ?? undefined,
    notes: original.notes ? `[Duplicated from ${quoteId.slice(0, 8)}] ${original.notes}` : `Duplicated from ${quoteId.slice(0, 8)}`,
    vatRate: original.vatRate ?? undefined,
    items: original.items.map((it) => ({
      description: it.description,
      qty: it.qty,
      unitPrice: it.unitPrice,
    })),
  });

  return NextResponse.json({ ok: true, quote: duplicate });
});
