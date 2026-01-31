export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import {
  computeBreakEven,
  type OverheadRow,
  type RateCardRow,
} from "@/lib/finance/breakEven";
import {
  startOfLondonMonth,
  endOfLondonMonth,
  londonToday,
} from "@/lib/time/london";
import { timeStart, logPerf } from "@/lib/perf/timing";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  const stopTotal = timeStart("break_even_total");
  let msDb = 0;

  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      logPerf("break_even", { msTotal: stopTotal(), ok: false, err: "forbidden" });
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      logPerf("break_even", { msTotal: stopTotal(), ok: false, err: "service_unavailable" });
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const now = new Date();
    const thisMonthStart = startOfLondonMonth(now);
    const thisMonthEnd = endOfLondonMonth(now);
    const lastMonthStart = startOfLondonMonth(
      new Date(thisMonthStart.getTime() - 1),
    );

    const stopDb = timeStart("break_even_db");
    const [company, overheadRows, rateCardRows, thisMonthPayments, lastMonthPayments] =
      await Promise.all([
        prisma.company
          .findUnique({
            where: { id: authCtx.companyId },
            select: { workingDaysPerMonth: true },
          })
          .catch(() => null),
        prisma.companyOverhead
          .findMany({ where: { companyId: authCtx.companyId } })
          .catch(() => []),
        prisma.rateCard
          .findMany({ where: { companyId: authCtx.companyId } })
          .catch(() => []),
        prisma.invoicePayment
          .findMany({
            where: {
              companyId: authCtx.companyId,
              receivedAt: { gte: thisMonthStart, lt: thisMonthEnd },
              status: "succeeded",
            },
            select: { amount: true },
          })
          .catch(() => []),
        prisma.invoicePayment
          .findMany({
            where: {
              companyId: authCtx.companyId,
              receivedAt: { gte: lastMonthStart, lt: thisMonthStart },
              status: "succeeded",
            },
            select: { amount: true },
          })
          .catch(() => []),
      ]);
    msDb = stopDb();

    const workingDaysPerMonth = company?.workingDaysPerMonth ?? 22;

    const overheads: OverheadRow[] = overheadRows.map((r: { label: string; amountPence: number; frequency: string }) => ({
      label: r.label,
      amountPence: r.amountPence,
      frequency: r.frequency as OverheadRow["frequency"],
    }));

    const rateCards: RateCardRow[] = rateCardRows.map((r: { name: string; costRatePerHour: number; chargeRatePerHour: number; isDefault: boolean }) => ({
      name: r.name,
      costRatePerHour: r.costRatePerHour,
      chargeRatePerHour: r.chargeRatePerHour,
      isDefault: r.isDefault,
    }));

    const thisMonthPence = Math.round(
      thisMonthPayments.reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0) * 100,
    );
    const lastMonthPence = Math.round(
      lastMonthPayments.reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0) * 100,
    );

    const result = computeBreakEven(
      overheads,
      rateCards,
      { thisMonthPence, lastMonthPence },
      londonToday(),
    );

    logPerf("break_even", {
      msTotal: stopTotal(),
      msDb,
      overheadCount: overheadRows.length,
      rateCardCount: rateCardRows.length,
      paymentCount: thisMonthPayments.length + lastMonthPayments.length,
      ok: true,
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...result,
        configured: overheadRows.length > 0,
        workingDaysPerMonth,
        earnedLabel: "Paid this month",
        earnedDefinition:
          "Sum of invoice payments received (status: succeeded) within the current London-time month.",
      },
    });
  } catch (error: unknown) {
    logPerf("break_even", { msTotal: stopTotal(), msDb, ok: false, err: "exception" });
    if (error && typeof error === "object" && "status" in error) {
      const e = error as { status: number };
      if (e.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      if (e.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/dashboard/break-even", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
