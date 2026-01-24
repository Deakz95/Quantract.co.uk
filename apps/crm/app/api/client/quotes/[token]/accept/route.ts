import { NextResponse } from "next/server";
import { quoteTotals } from "@/lib/server/db";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const POST = withRequestLogging(
  async function POST(_: Request, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await getRouteParams(ctx);
  const before = await repo.getQuoteByToken(token);
  if (!before) return NextResponse.json({
    ok: false,
    error: "Not found"
  }, {
    status: 404
  });
  const q = await repo.acceptQuoteByToken(token);
  if (!q) return NextResponse.json({
    ok: false,
    error: "Not found"
  }, {
    status: 404
  });
  const agreement = await repo.getAgreementForQuote(q.id);
  return NextResponse.json({
    ok: true,
    quote: {
      ...q,
      totals: quoteTotals(q),
      agreement: agreement ? {
        status: agreement.status,
        shareUrl: `/client/agreements/${agreement.token}`
      } : null
    }
  });
});
