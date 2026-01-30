import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { renderInvoicePdf } from "@/lib/server/pdf";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export const GET = withRequestLogging(
  async function GET(_: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
    await requireRole("admin");
    const { invoiceId } = await getRouteParams(ctx);
    const inv = await repo.getInvoiceById(invoiceId);
    if (!inv) return new Response("Not found", { status: 404 });
    const brand = await repo.getBrandContextForCurrentCompany();
    const pdf = await renderInvoicePdf(inv, brand);
    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${inv.invoiceNumber || inv.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }
);
