import * as repo from "@/lib/server/repo";
import { renderCertificatePdf } from "@/lib/server/pdf";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { pdfFilename } from "@/lib/server/pdfFilename";
import { requireClientOrPortalSession } from "@/lib/server/portalAuth";

export const runtime = "nodejs";

/**
 * GET /api/client/certificates/[certificateId]/pdf
 *
 * Renders and returns the certificate PDF for the authenticated client.
 * Supports both full client sessions and read-only portal sessions.
 * Scoped to companyId + clientEmail to prevent cross-tenant access.
 */
export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
    try {
      const session = await requireClientOrPortalSession();
      const { certificateId } = await getRouteParams(ctx);

      const pack = await repo.getCertificateById(certificateId);
      if (!pack) return new Response("Not found", { status: 404 });

      const { certificate: c, testResults } = pack;
      if (c.status !== "issued") return new Response("Not found", { status: 404 });

      // Verify ownership via clientId -> client email
      if (!c.clientId) return new Response("Forbidden", { status: 403 });
      const cl = await repo.getClientById(c.clientId);
      if (!cl || String(cl.email || "").toLowerCase() !== session.clientEmail.toLowerCase()) {
        return new Response("Forbidden", { status: 403 });
      }

      const client = await repo.getClientById(c.clientId);
      const site = c.siteId ? await repo.getSiteById(c.siteId) : null;
      const pdf = await renderCertificatePdf({
        certificate: c,
        client: client as any,
        site: site as any,
        testResults,
      });

      return new Response(pdf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${pdfFilename("certificate", (c as any).certificateNumber, (client as any)?.name)}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (e: any) {
      if (e?.status === 401) return new Response("Unauthorized", { status: 401 });
      if (e?.status === 403) return new Response("Forbidden", { status: 403 });
      console.error("[client/certificates/[certificateId]/pdf] Error:", e);
      return new Response("Internal error", { status: 500 });
    }
  },
);
