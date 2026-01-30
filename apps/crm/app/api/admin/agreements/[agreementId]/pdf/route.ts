import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { renderAuditAgreementPdf } from "@/lib/server/pdf";
import { readUploadBytes } from "@/lib/server/storage";
import { getRouteParams } from "@/lib/server/routeParams";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ agreementId: string }> }) {
  const authCtx = await requireCompanyContext();
  const role = getEffectiveRole(authCtx);
  if (role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { agreementId } = await getRouteParams(ctx);
  const a = await repo.getAgreementById(agreementId);
  if (!a || a.companyId !== authCtx.companyId) {
    return new Response("Not found", { status: 404 });
  }

  // Serve stored PDF if available
  if (a.auditPdfKey) {
    const stored = readUploadBytes(a.auditPdfKey);
    if (stored) {
      return new Response(new Uint8Array(stored), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="agreement-audit-${a.id}.pdf"`,
          "Cache-Control": "no-store"
        }
      });
    }
  }

  // Generate on-demand
  const pdf = await renderAuditAgreementPdf(a);
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="agreement-audit-${a.id}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
