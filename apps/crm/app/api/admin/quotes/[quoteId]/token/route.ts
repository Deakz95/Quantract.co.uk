import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import { quoteTotals } from "@/lib/server/db";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";

export async function POST(_: Request, ctx: { params: Promise<{ quoteId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { quoteId } = await getRouteParams(ctx);
  const next = await repo.rotateQuoteToken(quoteId);
  if (!next) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const agreement = await repo.getAgreementForQuote(next.id);
  const quoteAudit = await repo.listAuditForEntity("quote", next.id);
  const agreementAudit = agreement ? await repo.listAuditForEntity("agreement", agreement.id) : [];

  return NextResponse.json({
    ok: true,
    quote: {
      ...next,
      totals: quoteTotals(next),
      shareUrl: `/client/quotes/${next.token}`,
      agreement: agreement ? { id: agreement.id, status: agreement.status, shareUrl: `/client/agreements/${agreement.token}` } : null,
      audit: { quote: quoteAudit, agreement: agreementAudit },
    },
  });
}
