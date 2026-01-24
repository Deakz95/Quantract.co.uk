import * as repo from "@/lib/server/repo";
import { renderVariationPdf } from "@/lib/server/pdf";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
export const runtime = "nodejs";

export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await getRouteParams(ctx);
  const v = await repo.getVariationByToken(token);
  if (!v) return new Response("Not found", {
    status: 404
  });
  const brand = await repo.getBrandContextForVariationToken(token);

  // best-effort enrichment for nicer PDFs
  const job = v.jobId ? await repo.getJobById(v.jobId) : null;
  const client = job?.clientId ? await repo.getClientById(job.clientId) : null;
  const site = job?.siteId ? await repo.getSiteById(job.siteId) : null;
  const pdf = await renderVariationPdf({
    variation: v,
    client: client as any,
    site: site as any,
    quoteId: v.quoteId ?? null,
    brand
  });
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="variation-${v.id}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
});
