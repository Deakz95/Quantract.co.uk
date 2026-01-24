import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    await requireRoles("admin");
    const companyId = await requireCompanyId();

    const db = getPrisma();
    if (!db) {
      return jsonErr("Database not available", 503);
    }

    const url = new URL(req.url);
    const startDateStr = url.searchParams.get("startDate");
    const endDateStr = url.searchParams.get("endDate");

    // Default to current tax year (April to April in UK)
    const now = new Date();
    const currentYear = now.getFullYear();
    const taxYearStart = now.getMonth() >= 3 ? currentYear : currentYear - 1;

    const defaultStart = new Date(taxYearStart, 3, 6); // April 6th
    const defaultEnd = new Date(taxYearStart + 1, 3, 5); // April 5th next year

    const startDate = startDateStr ? new Date(startDateStr) : defaultStart;
    const endDate = endDateStr ? new Date(endDateStr) : defaultEnd;

    // Get all invoices issued in period
    const invoices = await db.invoice.findMany({
      where: {
        companyId,
        issuedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        subtotal: true,
        vatTotal: true,
        grandTotal: true,
        issuedAt: true,
      },
      orderBy: { issuedAt: "asc" },
    });

    // Group by month
    const monthlyBreakdown: Record<string, any> = {};

    invoices.forEach((invoice: any) => {
      const month = new Date(invoice.issuedAt).toISOString().slice(0, 7);

      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = {
          month,
          count: 0,
          subtotal: 0,
          vat: 0,
          total: 0,
        };
      }

      monthlyBreakdown[month].count++;
      monthlyBreakdown[month].subtotal += invoice.subtotal || 0;
      monthlyBreakdown[month].vat += invoice.vatTotal || 0;
      monthlyBreakdown[month].total += invoice.grandTotal || 0;
    });

    const months = Object.values(monthlyBreakdown).sort((a: any, b: any) =>
      a.month.localeCompare(b.month)
    );

    // Calculate totals
    const totalSubtotal = invoices.reduce((sum: number, inv: any) => sum + (inv.subtotal || 0), 0);
    const totalVAT = invoices.reduce((sum: number, inv: any) => sum + (inv.vatTotal || 0), 0);
    const totalGross = invoices.reduce((sum: number, inv: any) => sum + (inv.grandTotal || 0), 0);

    // Get company VAT rate for reference
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { defaultVatRate: true },
    });

    return jsonOk({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalInvoices: invoices.length,
        subtotal: Math.round(totalSubtotal * 100) / 100,
        vat: Math.round(totalVAT * 100) / 100,
        gross: Math.round(totalGross * 100) / 100,
        defaultVatRate: company?.defaultVatRate || 0.2,
      },
      monthlyBreakdown: months,
    });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[GET /api/admin/reports/tax-summary] Error:", e);
    return jsonErr(e, 500);
  }
});
