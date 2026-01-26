export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 401 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const [jobs, quotes, quotesList, invoices, timesheets] = await Promise.all([
      prisma.job.groupBy({ by: ["status"], where: { companyId: authCtx.companyId }, _count: true }),
      prisma.quote.groupBy({ by: ["status"], where: { companyId: authCtx.companyId }, _count: true }),
      prisma.quote.findMany({ where: { companyId: authCtx.companyId, status: "sent" } }),
      prisma.invoice.findMany({ where: { companyId: authCtx.companyId, status: "sent" } }),
      prisma.timesheet.count({ where: { companyId: authCtx.companyId, status: "submitted" } })
    ]);

    // Calculate quote totals
    const pendingQuoteValue = quotesList.reduce((a: number, q: any) => a + Number(q.total || 0), 0);

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
          pendingValue: pendingQuoteValue
        },
        invoices: {
          overdueCount: invoices.filter((i: any) => i.dueDate && i.dueDate < new Date()).length,
          unpaidTotal: invoices.reduce((a: number, i: any) => a + Number(i.total || 0), 0)
        }
      }
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/dashboard", action: "get" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/dashboard", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
