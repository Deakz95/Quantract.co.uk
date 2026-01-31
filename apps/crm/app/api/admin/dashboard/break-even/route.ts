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

// In-memory cache: keyed by companyId, TTL 60s
const cache = new Map<string, { json: object; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export const GET = withRequestLogging(async function GET() {
  const stopTotal = timeStart("break_even_total");
  let msAuth = 0;
  let msDb = 0;
  let msCompute = 0;
  let msSerialize = 0;

  try {
    const stopAuth = timeStart("break_even_auth");
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    msAuth = stopAuth();

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      logPerf("break_even", { msTotal: stopTotal(), msAuth, ok: false, err: "forbidden" });
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Check cache
    const cacheKey = authCtx.companyId;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      logPerf("break_even", { msTotal: stopTotal(), msAuth, ok: true, cacheHit: true });
      return NextResponse.json(cached.json);
    }

    const prisma = getPrisma();
    if (!prisma) {
      logPerf("break_even", { msTotal: stopTotal(), msAuth, ok: false, err: "service_unavailable" });
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const now = new Date();
    const thisMonthStart = startOfLondonMonth(now);
    const thisMonthEnd = endOfLondonMonth(now);
    const lastMonthStart = startOfLondonMonth(
      new Date(thisMonthStart.getTime() - 1),
    );

    const stopDb = timeStart("break_even_db");
    const [company, overheadRows, rateCardRows, thisMonthAgg, lastMonthAgg] =
      await Promise.all([
        prisma.company
          .findUnique({
            where: { id: authCtx.companyId },
            select: { workingDaysPerMonth: true },
          })
          .catch(() => null),
        prisma.companyOverhead
          .findMany({
            where: { companyId: authCtx.companyId },
            select: { label: true, amountPence: true, frequency: true },
          })
          .catch(() => []),
        prisma.rateCard
          .findMany({
            where: { companyId: authCtx.companyId },
            select: { name: true, costRatePerHour: true, chargeRatePerHour: true, isDefault: true },
          })
          .catch(() => []),
        prisma.invoicePayment
          .aggregate({
            where: {
              companyId: authCtx.companyId,
              receivedAt: { gte: thisMonthStart, lt: thisMonthEnd },
              status: "succeeded",
            },
            _sum: { amount: true },
          })
          .catch(() => ({ _sum: { amount: null } })),
        prisma.invoicePayment
          .aggregate({
            where: {
              companyId: authCtx.companyId,
              receivedAt: { gte: lastMonthStart, lt: thisMonthStart },
              status: "succeeded",
            },
            _sum: { amount: true },
          })
          .catch(() => ({ _sum: { amount: null } })),
      ]);
    msDb = stopDb();

    const stopCompute = timeStart("break_even_compute");
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

    // Aggregate returns pounds; convert to pence
    const thisMonthPence = Math.round((thisMonthAgg._sum.amount ?? 0) * 100);
    const lastMonthPence = Math.round((lastMonthAgg._sum.amount ?? 0) * 100);

    const result = computeBreakEven(
      overheads,
      rateCards,
      { thisMonthPence, lastMonthPence },
      londonToday(),
    );
    msCompute = stopCompute();

    const stopSer = timeStart("break_even_serialize");
    const json = {
      ok: true,
      data: {
        ...result,
        configured: overheadRows.length > 0,
        workingDaysPerMonth,
        earnedLabel: "Paid this month",
        earnedDefinition:
          "Sum of invoice payments received (status: succeeded) within the current London-time month.",
      },
    };
    msSerialize = stopSer();

    // Store in cache
    cache.set(cacheKey, { json, expiresAt: Date.now() + CACHE_TTL_MS });

    logPerf("break_even", {
      msTotal: stopTotal(),
      msAuth,
      msDb,
      msCompute,
      msSerialize,
      overheadCount: overheadRows.length,
      rateCardCount: rateCardRows.length,
      ok: true,
      cacheHit: false,
    });

    return NextResponse.json(json);
  } catch (error: unknown) {
    logPerf("break_even", { msTotal: stopTotal(), msAuth, msDb, msCompute, msSerialize, ok: false, err: "exception" });
    if (error && typeof error === "object" && "status" in error) {
      const e = error as { status: number };
      if (e.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      if (e.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/dashboard/break-even", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
