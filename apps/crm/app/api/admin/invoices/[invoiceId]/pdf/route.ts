import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { renderInvoicePdf } from "@/lib/server/pdf";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { pdfFilename } from "@/lib/server/pdfFilename";

export const runtime = "nodejs";

export const GET = withRequestLogging(
  async function GET(_: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
    await requireRole("admin");
    const { invoiceId } = await getRouteParams(ctx);
    const inv = await repo.getInvoiceById(invoiceId);
    if (!inv) return new Response("Not found", { status: 404 });
    const brand = await repo.getBrandContextForCurrentCompany();

    // Fetch line items from linked quote if available
    let lineItems: Array<{ description?: string; qty: number; unitPrice: number }> | undefined;
    let vatRate = 0.2;
    if (inv.quoteId) {
      const quote = await repo.getQuoteById(inv.quoteId);
      if (quote) {
        lineItems = (quote.items || []).map((it: any) => ({
          description: it.description || "",
          qty: Number(it.qty || it.quantity || 0),
          unitPrice: Number(it.unitPrice || 0),
        }));
        vatRate = quote.vatRate ?? 0.2;
      }
    }

    const pdf = await renderInvoicePdf(inv, brand, { lineItems, vatRate });
    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdfFilename("invoice", (inv as any).invoiceNumber, (inv as any).clientName)}"`,
        "Cache-Control": "no-store",
      },
    });
  }
);
