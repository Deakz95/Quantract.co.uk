import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { renderInvoicePdf } from "@/lib/server/pdf";
import { withRequestLogging } from "@/lib/server/observability";
export const runtime = "nodejs";
function csvEscape(v: unknown) {
  const s = String(v ?? "").replace(/\r?\n/g, " ");
  if (/[",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
export const GET = withRequestLogging(async function GET(_req: Request) {
  await requireRole("admin");
  const invoices = await repo.listInvoices();
  const brand = await repo.getBrandContextForCurrentCompany();
  const zip = new JSZip();
  const header = ["InvoiceNumber", "InvoiceId", "ClientName", "ClientEmail", "Status", "Subtotal", "VAT", "Total", "CreatedAt"].join(",");
  const rows = invoices.map(i => [csvEscape(i.invoiceNumber || ""), csvEscape(i.id), csvEscape(i.clientName), csvEscape(i.clientEmail), csvEscape(i.status), csvEscape(i.subtotal), csvEscape(i.vat), csvEscape(i.total), csvEscape(i.createdAtISO)].join(","));
  zip.file("invoices.csv", [header, ...rows].join("\n"));
  const folder = zip.folder("invoice_pdfs");
  for (const inv of invoices) {
    try {
      const bytes = await renderInvoicePdf(inv, brand);
      const name = `${inv.invoiceNumber || inv.id}.pdf`;
      folder?.file(name, bytes);
    } catch {

      // ignore
    }
  }
  const buf = await zip.generateAsync({
    type: "nodebuffer"
  });
  return new NextResponse(buf, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename=quantract-export-pack.zip`
    }
  });
});
