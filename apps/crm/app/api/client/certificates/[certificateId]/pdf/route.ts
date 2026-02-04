import { requireRole, getUserEmail } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { renderCertificatePdf } from "@/lib/server/pdf";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { pdfFilename } from "@/lib/server/pdfFilename";
export const runtime = "nodejs";

export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  await requireRole("client");
  const email = ((await getUserEmail()) || "").trim().toLowerCase();
  const { certificateId } = await getRouteParams(ctx);
  const pack = await repo.getCertificateById(certificateId);
  if (!pack) return new Response("Not found", {
    status: 404
  });
  const {
    certificate: c,
    testResults
  } = pack;
  if (c.status !== "issued") return new Response("Not found", {
    status: 404
  });
  if (!email) return new Response("Unauthorized", {
    status: 401
  });
  if (c.clientId) {
    const cl = await repo.getClientById(c.clientId);
    if (!cl || String(cl.email || "").toLowerCase() !== email) return new Response("Forbidden", {
      status: 403
    });
  } else {
    return new Response("Forbidden", { status: 403 });
  }
  const client = c.clientId ? await repo.getClientById(c.clientId) : null;
  const site = c.siteId ? await repo.getSiteById(c.siteId) : null;
  const pdf = await renderCertificatePdf({
    certificate: c,
    client: client as any,
    site: site as any,
    testResults
  });
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdfFilename("certificate", (c as any).certificateNumber, (client as any)?.name)}"`,
      "Cache-Control": "no-store"
    }
  });
});
