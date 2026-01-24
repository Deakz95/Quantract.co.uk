import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
export const GET = withRequestLogging(async function GET(_req: Request) {
  await requireRole("admin");
  const invoices = await repo.listInvoices();
  const rows = invoices.filter(i => i.status !== "draft").map(i => {
    const invoiceDate = new Date(i.createdAtISO).toISOString().slice(0, 10);
    return {
      ContactName: i.clientName,
      EmailAddress: i.clientEmail,
      InvoiceNumber: i.id,
      InvoiceDate: invoiceDate,
      DueDate: invoiceDate,
      Description: `${i.type || "stage"}${i.stageName ? ` - ${i.stageName}` : ""}`,
      Quantity: 1,
      UnitAmount: i.subtotal.toFixed(2),
      TaxAmount: i.vat.toFixed(2),
      Total: i.total.toFixed(2),
      Currency: "GBP"
    };
  });
  const header = ["ContactName", "EmailAddress", "InvoiceNumber", "InvoiceDate", "DueDate", "Description", "Quantity", "UnitAmount", "TaxAmount", "Total", "Currency"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(header.map(h => csvEscape((r as any)[h])).join(","));
  }
  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=quantract-xero-invoices.csv"
    }
  });
});
