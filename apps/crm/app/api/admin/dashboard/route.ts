export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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

    const [jobs, quotes, quotesList, invoices, timesheets] = await Promise.all([
      prisma.job.groupBy({ by: ["status"], where: { companyId: authCtx.companyId }, _count: true }),
      prisma.quote.groupBy({ by: ["status"], where: { companyId: authCtx.companyId }, _count: true }),
      prisma.quote.findMany({ where: { companyId: authCtx.companyId, status: { in: ["draft", "sent"] } } }),
      prisma.invoice.findMany({ where: { companyId: authCtx.companyId, status: { in: ["draft", "sent"] } } }),
      prisma.timesheet.count({ where: { companyId: authCtx.companyId, status: "submitted" } })
    ]);

    // Calculate quote totals (draft + sent)
    const openQuoteValue = quotesList.reduce((a: number, q: any) => a + Number(q.total || 0), 0);
    const draftQuotes = quotesList.filter((q: any) => q.status === "draft");
    const sentQuotes = quotesList.filter((q: any) => q.status === "sent");

    // Calculate invoice totals (draft + sent = unpaid)
    const now = new Date();
    const unpaidTotal = invoices.reduce((a: number, i: any) => a + Number(i.total || 0), 0);
    const overdueCount = invoices.filter((i: any) => i.dueAt && new Date(i.dueAt) < now).length;

    return NextResponse.json({
      ok: true,
      data: {
        counts: {
          jobs,
          quotes,
          timesheetsPendingApproval: timesheets
        },
        quotes: {
          pendingCount: quotesList.length,
          pendingValue: openQuoteValue,
          draftCount: draftQuotes.length,
          sentCount: sentQuotes.length,
        },
        invoices: {
          unpaidCount: invoices.length,
          overdueCount,
          unpaidTotal,
        }
      }
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/dashboard", action: "get" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/dashboard", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
