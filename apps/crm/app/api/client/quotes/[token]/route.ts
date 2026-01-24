import { NextResponse } from "next/server";
import { quoteTotals } from "@/lib/server/db";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";

export async function GET(_: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await getRouteParams(ctx);
  const q = await repo.getQuoteByToken(token);
  if (!q) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  await repo.recordAuditEvent({
    entityType: "quote",
    entityId: q.id,
    action: "quote.viewed",
    actorRole: "client",
    actor: q.clientEmail,
    meta: { token },
  });

  const agreement = q.status === "accepted" ? await repo.getAgreementForQuote(q.id) : null;
  const variations = await repo.listVariationsForQuote(q.id);

  return NextResponse.json({
    ok: true,
    quote: {
      ...q,
      totals: quoteTotals(q),
      agreement: agreement ? { status: agreement.status, shareUrl: `/client/agreements/${agreement.token}` } : null,
      variations: variations.map((v) => ({
        id: v.id,
        token: v.token,
        title: v.title,
        status: v.status,
        subtotal: v.subtotal,
        vat: v.vat,
        total: v.total,
        createdAtISO: v.createdAtISO,
      })),
    },
  });
}
