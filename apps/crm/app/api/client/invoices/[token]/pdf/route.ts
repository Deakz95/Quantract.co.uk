import { NextResponse } from "next/server";
import * as repo from "@/lib/server/repo";
import { renderInvoicePdf } from "@/lib/server/pdf";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await getRouteParams(ctx);
  const invoice = await repo.getInvoiceByToken(token);
  if (!invoice) return NextResponse.json({
    error: "not_found"
  }, {
    status: 404
  });
  const brand = await repo.getBrandContextForInvoiceToken(token);
  const bytes = await renderInvoicePdf(invoice, brand);
  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="invoice-${invoice.id}.pdf"`,
      "cache-control": "no-store"
    }
  });
});
