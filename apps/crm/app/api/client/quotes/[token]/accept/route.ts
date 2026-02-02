import { NextResponse } from "next/server";
import { quoteTotals } from "@/lib/server/db";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const POST = withRequestLogging(
  async function POST(_: Request, ctx: { params: Promise<{ token: string }> }) {
    try {
      const { token } = await getRouteParams(ctx);
      const before = await repo.getQuoteByToken(token);
      if (!before) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }
      const q = await repo.acceptQuoteByToken(token);
      if (!q) {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
      }
      const agreement = await repo.getAgreementForQuote(q.id);
      return NextResponse.json({
        ok: true,
        quote: {
          ...q,
          totals: quoteTotals(q),
          agreement: agreement
            ? { status: agreement.status, shareUrl: `/client/agreements/${agreement.token}` }
            : null,
        },
      });
    } catch (error) {
      logError(error, { route: "/api/client/quotes/[token]/accept", action: "accept" });
      logError(error, { route: "/api/client/quotes/[token]/accept", action: "accept" });
      return NextResponse.json({ ok: false, error: "accept_failed" }, { status: 500 });
    }
  }
);
