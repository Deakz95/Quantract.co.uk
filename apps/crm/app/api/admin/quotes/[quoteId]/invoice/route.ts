import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const POST = withRequestLogging(async function POST(_req: Request, ctx: { params: Promise<{ quoteId: string }> }) {
  await requireRole("admin");
  const { quoteId } = await getRouteParams(ctx);
  const invoice = await repo.ensureInvoiceForQuote(quoteId);
  if (!invoice) return NextResponse.json({
    error: "quote_not_found"
  }, {
    status: 404
  });
  return NextResponse.json({
    invoice
  });
});
