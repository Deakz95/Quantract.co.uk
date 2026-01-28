export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

type DailyRevenue = {
  date: string;
  amount: number;
};

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Start of current month
    const thisMonthStart = new Date(currentYear, currentMonth, 1);
    // End of current month (start of next month)
    const thisMonthEnd = new Date(currentYear, currentMonth + 1, 1);

    // Start of last month
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
    // End of last month (start of current month)
    const lastMonthEnd = thisMonthStart;

    // Fetch paid invoices for this month
    const thisMonthPayments = await prisma.invoicePayment.findMany({
      where: {
        companyId: authCtx.companyId,
        receivedAt: {
          gte: thisMonthStart,
          lt: thisMonthEnd,
        },
        status: "succeeded",
      },
      select: {
        amount: true,
        receivedAt: true,
      },
    });

    // Fetch paid invoices for last month
    const lastMonthPayments = await prisma.invoicePayment.findMany({
      where: {
        companyId: authCtx.companyId,
        receivedAt: {
          gte: lastMonthStart,
          lt: lastMonthEnd,
        },
        status: "succeeded",
      },
      select: {
        amount: true,
      },
    });

    // Calculate totals
    const thisMonthTotal = thisMonthPayments.reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);
    const lastMonthTotal = lastMonthPayments.reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0);

    // Calculate percentage change
    let percentChange = 0;
    if (lastMonthTotal > 0) {
      percentChange = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);
    } else if (thisMonthTotal > 0) {
      percentChange = 100; // If last month was 0 and this month has revenue
    }

    // Build daily revenue for the current month (for the chart)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyRevenue: DailyRevenue[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = date.toISOString().split("T")[0];
      dailyRevenue.push({ date: dateStr, amount: 0 });
    }

    // Aggregate payments by day
    for (const payment of thisMonthPayments) {
      const dayOfMonth = payment.receivedAt.getDate();
      if (dayOfMonth >= 1 && dayOfMonth <= daysInMonth) {
        dailyRevenue[dayOfMonth - 1].amount += payment.amount || 0;
      }
    }

    // Find max daily revenue for scaling
    const maxDailyRevenue = Math.max(...dailyRevenue.map(d => d.amount), 1);

    return NextResponse.json({
      ok: true,
      data: {
        thisMonth: {
          total: Math.round(thisMonthTotal * 100) / 100,
          monthName: thisMonthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        },
        lastMonth: {
          total: Math.round(lastMonthTotal * 100) / 100,
          monthName: lastMonthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        },
        percentChange,
        dailyRevenue: dailyRevenue.map(d => ({
          ...d,
          amount: Math.round(d.amount * 100) / 100,
          percentage: Math.round((d.amount / maxDailyRevenue) * 100),
        })),
        maxDailyRevenue: Math.round(maxDailyRevenue * 100) / 100,
      },
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/dashboard/revenue", action: "get" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/dashboard/revenue", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
