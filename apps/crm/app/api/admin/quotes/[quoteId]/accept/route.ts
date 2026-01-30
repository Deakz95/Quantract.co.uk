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
  const q = await repo.getQuoteById(quoteId);
  if (!q) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (q.status === "accepted") {
    // Already accepted — return current state
    const agreement = await repo.getAgreementForQuote(q.id);
    return NextResponse.json({
      ok: true,
      quote: {
        ...q,
        totals: quoteTotals(q),
        shareUrl: `/client/quotes/${q.token}`,
        agreement: agreement
          ? { id: agreement.id, status: agreement.status, shareUrl: `/client/agreements/${agreement.token}` }
          : null,
      },
    });
  }

  // Accept via the token-based function (reuses all side-effects: agreement, invoice, job)
  const accepted = await repo.acceptQuoteByToken(q.token);
  if (!accepted) {
    return NextResponse.json({ ok: false, error: "accept_failed" }, { status: 500 });
  }

  const agreement = await repo.getAgreementForQuote(accepted.id);
  const quoteAudit = await repo.listAuditForEntity("quote", accepted.id);
  const agreementAudit = agreement ? await repo.listAuditForEntity("agreement", agreement.id) : [];

  return NextResponse.json({
    ok: true,
    quote: {
      ...accepted,
      totals: quoteTotals(accepted),
      shareUrl: `/client/quotes/${accepted.token}`,
      agreement: agreement
        ? { id: agreement.id, status: agreement.status, shareUrl: `/client/agreements/${agreement.token}` }
        : null,
      audit: {
        quote: quoteAudit,
        agreement: agreementAudit,
      },
    },
  });
}
