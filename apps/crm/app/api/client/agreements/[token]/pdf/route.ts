import * as repo from "@/lib/server/repo";
import { renderClientAgreementPdf } from "@/lib/server/pdf";
import { readUploadBytes } from "@/lib/server/storage";
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

  // Serve stored PDF if available
  if (a.clientPdfKey) {
    const stored = readUploadBytes(a.clientPdfKey);
    if (stored) {
      return new Response(new Uint8Array(stored), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="agreement-${a.id}.pdf"`,
          "Cache-Control": "no-store"
        }
      });
    }
  }

  // Generate on-demand (don't store)
  const brand = await repo.getBrandContextForAgreementToken(a.token);
  const pdf = await renderClientAgreementPdf(a, brand);
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="agreement-${a.id}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
});
