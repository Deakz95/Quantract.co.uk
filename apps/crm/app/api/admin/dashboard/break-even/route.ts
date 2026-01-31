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

export const runtime = "nodejs";

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
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [overheadRows, rateCardRows, thisMonthPayments, lastMonthPayments] =
      await Promise.all([
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

    // Revenue amounts from invoicePayment are stored in pounds — convert to pence
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
      now,
    );

    return NextResponse.json({
      ok: true,
      data: {
        ...result,
        configured: overheadRows.length > 0,
        earnedLabel: "Paid this month",
        earnedDefinition: "Total value of invoice payments received this month.",
      },
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error) {
      const e = error as { status: number };
      if (e.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      if (e.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/dashboard/break-even", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
