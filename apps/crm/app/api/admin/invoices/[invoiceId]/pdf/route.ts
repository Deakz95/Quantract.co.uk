import { requireRole, requireCompanyId, requireFinancialAccess } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { renderInvoicePdf, tryRenderWithTemplate } from "@/lib/server/pdf";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { pdfFilename } from "@/lib/server/pdfFilename";

export const runtime = "nodejs";

export const GET = withRequestLogging(
  async function GET(_: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
    await requireFinancialAccess();
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

    // Try custom template first, fall back to hardcoded
    let pdf: Buffer | null = null;
    const companyId = await requireCompanyId().catch(() => null);
    if (companyId) {
      const templateResult = await tryRenderWithTemplate(companyId, "invoice", {
        companyName: brand.name,
        id: inv.id,
        invoiceNumber: (inv as any).invoiceNumber || "",
        createdAt: new Date(inv.createdAtISO).toLocaleDateString("en-GB"),
        paidAt: inv.paidAtISO ? new Date(inv.paidAtISO).toLocaleDateString("en-GB") : "",
        clientName: inv.clientName,
        clientEmail: inv.clientEmail,
        subtotal: `\u00A3${inv.subtotal.toFixed(2)}`,
        vat: `\u00A3${inv.vat.toFixed(2)}`,
        vatPercent: String(Math.round((inv.subtotal > 0 ? inv.vat / inv.subtotal : 0.2) * 100)),
        total: `\u00A3${inv.total.toFixed(2)}`,
        status: inv.status.toUpperCase(),
        footerLine1: brand.footerLine1 || "",
        footerLine2: brand.footerLine2 || "",
        contactDetails: brand.contactDetails || "",
        items: lineItems?.map(it => ({
          description: it.description || "Item",
          qty: String(it.qty),
          unitPrice: `\u00A3${it.unitPrice.toFixed(2)}`,
          lineTotal: `\u00A3${(it.qty * it.unitPrice).toFixed(2)}`,
        })) || [],
      }, brand);
      if (templateResult) pdf = templateResult.buffer;
    }

    if (!pdf) {
      pdf = await renderInvoicePdf(inv, brand, { lineItems, vatRate });
    }

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdfFilename("invoice", (inv as any).invoiceNumber, (inv as any).clientName)}"`,
        "Cache-Control": "no-store",
      },
    });
  }
);
