export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);

    const [
      todaySchedule,
      submittedTimesheets,
      pendingExpenses,
      overdueChecks,
      upcomingChecks,
      overdueInvoices,
      unbilledJobs,
      activeJobs,
    ] = await Promise.all([
      // Dispatch today - schedule entries for today
      prisma.scheduleEntry.findMany({
        where: { companyId: cid, startAt: { gte: todayStart, lt: todayEnd } },
        include: {
          job: { select: { id: true, title: true, status: true } },
          engineer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { startAt: "asc" },
        take: 20,
      }),

      // Submitted timesheets awaiting approval
      prisma.timesheet.count({
        where: { companyId: cid, status: "submitted" },
      }),

      // Expenses that are not yet confirmed/posted
      prisma.expense.count({
        where: { companyId: cid, status: { in: ["UPLOADED", "PARSED"] } },
      }),

      // Overdue scheduled checks
      prisma.scheduledCheck.count({
        where: { companyId: cid, status: "overdue" },
      }),

      // Upcoming checks due within 7 days
      prisma.scheduledCheck.findMany({
        where: {
          companyId: cid,
          status: "pending",
          dueAt: { gte: now, lte: weekFromNow },
        },
        include: {
          asset: { select: { id: true, name: true, type: true } },
        },
        orderBy: { dueAt: "asc" },
        take: 10,
      }),

      // Overdue invoices (sent but past due date)
      prisma.invoice.findMany({
        where: {
          companyId: cid,
          deletedAt: null,
          status: "sent",
          dueAt: { lt: now },
        },
        select: { id: true, invoiceNumber: true, clientName: true, total: true, dueAt: true },
        orderBy: { dueAt: "asc" },
        take: 10,
      }),

      // Unbilled completed jobs (status = completed, no invoices)
      prisma.job.findMany({
        where: {
          companyId: cid,
          deletedAt: null,
          status: "completed",
          invoices: { none: {} },
        },
        select: { id: true, title: true, jobNumber: true, budgetTotal: true },
        take: 10,
      }),

      // Active jobs with no recent schedule entry (potential problems)
      prisma.job.count({
        where: {
          companyId: cid,
          deletedAt: null,
          status: "active",
        },
      }),
    ]);

    let overdueInvoiceTotal = 0;
    for (const inv of overdueInvoices) overdueInvoiceTotal += inv.total || 0;
    let unbilledTotal = 0;
    for (const j of unbilledJobs) unbilledTotal += j.budgetTotal || 0;

    return NextResponse.json({
      ok: true,
      data: {
        dispatch: {
          todayCount: todaySchedule.length,
          entries: todaySchedule,
        },
        approvals: {
          timesheetsPending: submittedTimesheets,
          expensesPending: pendingExpenses,
          total: submittedTimesheets + pendingExpenses,
        },
        compliance: {
          overdueChecks,
          upcomingChecks: upcomingChecks.length,
          upcomingItems: upcomingChecks,
        },
        profitLeakage: {
          overdueInvoiceCount: overdueInvoices.length,
          overdueInvoiceTotal,
          overdueInvoices,
          unbilledJobCount: unbilledJobs.length,
          unbilledTotal,
          unbilledJobs,
        },
        problems: {
          overdueChecks,
          overdueInvoiceCount: overdueInvoices.length,
          activeJobCount: activeJobs,
        },
      },
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/office/summary", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
