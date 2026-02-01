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

export const GET = withRequestLogging(async function GET() {
  try {
    await requireRoles("admin");
    const companyId = await requireCompanyId();

    const db = getPrisma();
    if (!db) {
      return jsonErr("Database not available", 503);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all unpaid invoices with payments
    const invoices = await db.invoice.findMany({
      where: {
        companyId,
        status: { not: "paid" },
      },
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
        invoicePayments: {
          select: { amount: true },
        },
      },
      orderBy: { dueAt: "asc" },
    });

    // Categorize by aging buckets
    const aging = {
      current: [] as any[],
      days1to30: [] as any[],
      days31to60: [] as any[],
      days61to90: [] as any[],
      days90plus: [] as any[],
    };

    const totals = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      days90plus: 0,
      total: 0,
    };

    for (const invoice of invoices) {
      const dueDate = new Date(invoice.dueAt);
      const daysOverdue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate outstanding amount
      const totalPaid = invoice.invoicePayments.reduce(
        (sum: number, payment: { amount: number | null }) => sum + (payment.amount || 0),
        0
      );
      const outstanding = (invoice.total || 0) - totalPaid;

      if (outstanding <= 0) continue; // Skip if fully paid

      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        client: invoice.client?.name || "Unknown",
        clientEmail: invoice.client?.email,
        total: invoice.total,
        paid: totalPaid,
        outstanding,
        dueAt: invoice.dueAt,
        daysOverdue,
        createdAt: invoice.createdAt,
      };

      // Categorize by days overdue
      if (daysOverdue < 0) {
        aging.current.push(invoiceData);
        totals.current += outstanding;
      } else if (daysOverdue <= 30) {
        aging.days1to30.push(invoiceData);
        totals.days1to30 += outstanding;
      } else if (daysOverdue <= 60) {
        aging.days31to60.push(invoiceData);
        totals.days31to60 += outstanding;
      } else if (daysOverdue <= 90) {
        aging.days61to90.push(invoiceData);
        totals.days61to90 += outstanding;
      } else {
        aging.days90plus.push(invoiceData);
        totals.days90plus += outstanding;
      }

      totals.total += outstanding;
    }

    return jsonOk({
      asOfDate: today.toISOString(),
      aging,
      totals,
      summary: {
        totalInvoices: invoices.length,
        totalOutstanding: totals.total,
        averageDaysOverdue:
          invoices.length > 0
            ? Math.round(
                invoices.reduce((sum: any, inv: any) => {
                  const dueDate = new Date(inv.dueAt);
                  const days = Math.max(
                    0,
                    Math.floor(
                      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
                    )
                  );
                  return sum + days;
                }, 0) / invoices.length
              )
            : 0,
      },
    });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[GET /api/admin/reports/ar-aging] Error:", e);
    return jsonErr(e, 500);
  }
});
