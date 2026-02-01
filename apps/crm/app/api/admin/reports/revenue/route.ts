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
    const groupBy = url.searchParams.get("groupBy") || "month"; // month, quarter, year

    // Default to last 12 months
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    // Get all invoices in period
    const invoices = await db.invoice.findMany({
      where: {
        companyId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        subtotal: true,
        vat: true,
        total: true,
        createdAt: true,
        invoicePayments: {
          select: {
            amount: true,
            receivedAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group invoices by period
    const periods: Record<string, any> = {};

    invoices.forEach((invoice: any) => {
      const date = new Date(invoice.createdAt);
      let periodKey = "";

      if (groupBy === "year") {
        periodKey = date.getFullYear().toString();
      } else if (groupBy === "quarter") {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `${date.getFullYear()}-Q${quarter}`;
      } else {
        // month
        periodKey = date.toISOString().slice(0, 7); // YYYY-MM
      }

      if (!periods[periodKey]) {
        periods[periodKey] = {
          period: periodKey,
          invoicesIssued: 0,
          invoicesPaid: 0,
          totalIssued: 0,
          totalPaid: 0,
          outstanding: 0,
        };
      }

      periods[periodKey].invoicesIssued++;
      periods[periodKey].totalIssued += invoice.total || 0;

      // Calculate paid amount
      const paidAmount = invoice.invoicePayments.reduce(
        (sum: number, payment: { amount: number | null }) => sum + (payment.amount || 0),
        0
      );

      if (paidAmount >= (invoice.total || 0)) {
        periods[periodKey].invoicesPaid++;
      }

      periods[periodKey].totalPaid += paidAmount;
      periods[periodKey].outstanding += (invoice.total || 0) - paidAmount;
    });

    // Convert to sorted array
    const breakdown = Object.values(periods)
      .sort((a: any, b: any) => a.period.localeCompare(b.period))
      .map((p: any) => ({
        ...p,
        totalIssued: Math.round(p.totalIssued * 100) / 100,
        totalPaid: Math.round(p.totalPaid * 100) / 100,
        outstanding: Math.round(p.outstanding * 100) / 100,
      }));

    // Calculate summary
    const totalIssued = invoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
    const totalPaid = invoices.reduce((sum: number, inv: any) => {
      const paid = inv.invoicePayments.reduce((s: number, p: { amount: number | null }) => s + (p.amount || 0), 0);
      return sum + paid;
    }, 0);
    const totalOutstanding = totalIssued - totalPaid;

    const paidInvoices = invoices.filter((inv: any) => {
      const paid = inv.invoicePayments.reduce((s: number, p: { amount: number | null }) => s + (p.amount || 0), 0);
      return paid >= (inv.total || 0);
    });

    return jsonOk({
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy,
      },
      summary: {
        totalInvoices: invoices.length,
        totalIssued: Math.round(totalIssued * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        paidInvoices: paidInvoices.length,
        collectionRate:
          totalIssued > 0
            ? Math.round((totalPaid / totalIssued) * 100 * 10) / 10
            : 0,
      },
      breakdown,
    });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[GET /api/admin/reports/revenue] Error:", e);
    return jsonErr(e, 500);
  }
});
