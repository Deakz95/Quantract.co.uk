import * as repo from "@/lib/server/repo";
import { renderAgreementPdf } from "@/lib/server/pdf";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
export const runtime = "nodejs";

export const GET = withRequestLogging(
  async function GET(_: Request, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await getRouteParams(ctx);
  let a = await repo.getAgreementByToken(token);

// Playwright passes quote.token here, not agreement.token.
// If no agreement found, treat token as a quote token and resolve agreement from the quote.
if (!a) {
  const q = await repo.getQuoteByToken(token);
  if (q) {
    a = await repo.getAgreementForQuote(q.id);
  }
}

if (!a) return new Response("Not found", { status: 404 });
  const pdf = await renderAgreementPdf(a);
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="agreement-${a.id}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
});
