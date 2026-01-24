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

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Parallel queries for dashboard metrics
    const [
      pipelineValueData,
      jobsTodayData,
      overdueInvoicesData,
      activeJobsData,
      pendingTasksData,
      recentEnquiriesData,
    ] = await Promise.all([
      // Pipeline value (quotes in progress)
      db.quote.aggregate({
        where: {
          companyId,
          status: { in: ["draft", "sent", "accepted"] },
        },
        _sum: { grandTotal: true },
        _count: true,
      }),

      // Jobs scheduled for today
      db.job.findMany({
        where: {
          companyId,
          scheduledAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          engineer: { select: { name: true, email: true } },
          site: { select: { address1: true } },
        },
        orderBy: { scheduledAt: "asc" },
      }),

      // Overdue invoices
      db.invoice.findMany({
        where: {
          companyId,
          status: { not: "paid" },
          dueAt: { lt: today },
        },
        include: {
          client: { select: { name: true } },
        },
        orderBy: { dueAt: "asc" },
        take: 10,
      }),

      // Active jobs count
      db.job.count({
        where: {
          companyId,
          status: { in: ["scheduled", "in_progress"] },
        },
      }),

      // Pending tasks assigned to me
      db.task.count({
        where: {
          companyId,
          status: { not: "done" },
        },
      }),

      // Recent enquiries
      db.enquiry.count({
        where: {
          companyId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    // Calculate overdue total
    const overdueTotal = overdueInvoicesData.reduce(
      (sum: number, inv: { grandTotal: number | null }) => sum + (inv.grandTotal || 0),
      0
    );

    return jsonOk({
      metrics: {
        pipelineValue: pipelineValueData._sum.grandTotal || 0,
        pipelineCount: pipelineValueData._count,
        jobsToday: jobsTodayData.length,
        overdueInvoices: overdueInvoicesData.length,
        overdueTotal,
        activeJobs: activeJobsData,
        pendingTasks: pendingTasksData,
        recentEnquiries: recentEnquiriesData,
      },
      details: {
        jobsToday: jobsTodayData,
        overdueInvoices: overdueInvoicesData.map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          client: inv.client?.name,
          total: inv.grandTotal,
          dueAt: inv.dueAt,
          daysOverdue: Math.floor(
            (today.getTime() - new Date(inv.dueAt).getTime()) / (1000 * 60 * 60 * 24)
          ),
        })),
      },
    });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[GET /api/admin/reports/dashboard] Error:", e);
    return jsonErr(e, 500);
  }
});
