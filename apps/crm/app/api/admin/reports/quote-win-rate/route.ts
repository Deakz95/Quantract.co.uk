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

    // Default to last 90 days
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Get all quotes in date range
    const quotes = await db.quote.findMany({
      where: {
        companyId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        status: true,
        items: true,
        vatRate: true,
        createdAt: true,
        clientEmail: true,
        acceptedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute total from items JSON
    function quoteTotal(q: any): number {
      const items = Array.isArray(q.items) ? q.items : [];
      const subtotal = items.reduce((s: number, i: any) => s + (Number(i.qty || i.quantity || 1) * Number(i.unitPrice || i.price || 0)), 0);
      const vatRate = Number(q.vatRate || 0);
      return subtotal * (1 + vatRate);
    }

    // Categorize quotes
    const won = quotes.filter(
      (q: any) => q.status === "accepted" || q.acceptedAt
    );
    const lost = quotes.filter((q: any) => q.status === "rejected" || q.status === "expired");
    const pending = quotes.filter(
      (q: any) =>
        q.status === "draft" ||
        q.status === "sent" ||
        (q.status !== "accepted" &&
          q.status !== "rejected" &&
          q.status !== "expired" &&
          !q.acceptedAt)
    );

    const totalQuotes = quotes.length;
    const wonCount = won.length;
    const lostCount = lost.length;
    const pendingCount = pending.length;

    const wonValue = won.reduce((sum: number, q: any) => sum + quoteTotal(q), 0);
    const lostValue = lost.reduce((sum: number, q: any) => sum + quoteTotal(q), 0);
    const pendingValue = pending.reduce((sum: number, q: any) => sum + quoteTotal(q), 0);
    const totalValue = quotes.reduce((sum: number, q: any) => sum + quoteTotal(q), 0);

    // Win rate (excluding pending)
    const decidedQuotes = wonCount + lostCount;
    const winRate = decidedQuotes > 0 ? (wonCount / decidedQuotes) * 100 : 0;

    // Average quote value
    const avgQuoteValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;
    const avgWonValue = wonCount > 0 ? wonValue / wonCount : 0;

    // Monthly breakdown
    const monthlyStats: Record<string, any> = {};

    quotes.forEach((quote: any) => {
      const month = new Date(quote.createdAt).toISOString().slice(0, 7); // YYYY-MM

      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          month,
          total: 0,
          won: 0,
          lost: 0,
          pending: 0,
          totalValue: 0,
          wonValue: 0,
        };
      }

      monthlyStats[month].total++;
      monthlyStats[month].totalValue += quoteTotal(quote) || 0;

      if (quote.status === "accepted" || quote.agreement?.signedAt) {
        monthlyStats[month].won++;
        monthlyStats[month].wonValue += quoteTotal(quote) || 0;
      } else if (quote.status === "rejected" || quote.status === "expired") {
        monthlyStats[month].lost++;
      } else {
        monthlyStats[month].pending++;
      }
    });

    // Calculate win rate per month
    Object.values(monthlyStats).forEach((month: any) => {
      const decided = month.won + month.lost;
      month.winRate = decided > 0 ? Math.round((month.won / decided) * 100 * 10) / 10 : 0;
    });

    const monthlyBreakdown = Object.values(monthlyStats).sort((a: any, b: any) =>
      a.month.localeCompare(b.month)
    );

    return jsonOk({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalQuotes,
        wonCount,
        lostCount,
        pendingCount,
        winRate: Math.round(winRate * 10) / 10,
        totalValue,
        wonValue,
        lostValue,
        pendingValue,
        avgQuoteValue: Math.round(avgQuoteValue * 100) / 100,
        avgWonValue: Math.round(avgWonValue * 100) / 100,
      },
      monthlyBreakdown,
    });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[GET /api/admin/reports/quote-win-rate] Error:", e);
    return jsonErr(e, 500);
  }
});
