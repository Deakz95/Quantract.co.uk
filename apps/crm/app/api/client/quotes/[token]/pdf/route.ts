import * as repo from "@/lib/server/repo";
import { renderQuotePdf } from "@/lib/server/pdf";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { pdfFilename } from "@/lib/server/pdfFilename";
export const runtime = "nodejs";

export const GET = withRequestLogging(
  async function GET(_: Request, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await getRouteParams(ctx);
  const q = await repo.getQuoteByToken(token);
  if (!q) return new Response("Not found", {
    status: 404
  });
  const brand = await repo.getBrandContextForQuoteToken(token);
  const pdf = await renderQuotePdf(q, brand);
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdfFilename("quote", (q as any).quoteNumber, (q as any).clientName)}"`,
      "Cache-Control": "no-store"
    }
  });
});
