export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { timeStart, logPerf } from "@/lib/perf/timing";

export const runtime = "nodejs";

// In-memory TTL cache keyed by companyId
const cache = new Map<string, { json: object; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

export const GET = withRequestLogging(async function GET() {
  const stopTotal = timeStart("dashboard_summary_total");

  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Check cache
    const cacheKey = authCtx.companyId;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      logPerf("dashboard_summary", { msTotal: stopTotal(), ok: true, cacheHit: true });
      return NextResponse.json(cached.json);
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const thisMonthStart = new Date(currentYear, currentMonth, 1);
    const thisMonthEnd = new Date(currentYear, currentMonth + 1, 1);
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);

    const stopDb = timeStart("dashboard_summary_db");

    // Run all queries in parallel
    const [
      jobs,
      quotes,
      quotesList,
      invoices,
      timesheets,
      openEnquiries,
      auditEvents,
      recentQuotes,
      recentInvoices,
      recentJobs,
      thisMonthPayments,
      lastMonthPayments,
      engineers,
    ] = await Promise.all([
      // KPI queries
      prisma.job.groupBy({ by: ["status"], where: { companyId: authCtx.companyId, deletedAt: null }, _count: true }),
      prisma.quote.groupBy({ by: ["status"], where: { companyId: authCtx.companyId, deletedAt: null }, _count: true }),
      prisma.quote.findMany({ where: { companyId: authCtx.companyId, deletedAt: null, status: { in: ["draft", "sent"] } } }),
      prisma.invoice.findMany({ where: { companyId: authCtx.companyId, deletedAt: null, status: { in: ["draft", "sent"] } } }),
      prisma.timesheet.count({ where: { companyId: authCtx.companyId, status: "submitted" } }),
      prisma.enquiry.count({ where: { companyId: authCtx.companyId, pipelineStage: { isWon: false, isLost: false } } }).catch(() => 0),

      // Activity queries
      prisma.auditEvent.findMany({
        where: { companyId: authCtx.companyId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          quote: { select: { id: true, clientName: true } },
          invoice: { select: { id: true, invoiceNumber: true, clientName: true } },
          job: { select: { id: true, title: true } },
          certificate: { select: { id: true, certificateNumber: true } },
        },
      }),
      prisma.quote.findMany({
        where: { companyId: authCtx.companyId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, clientName: true, status: true, updatedAt: true, acceptedAt: true },
      }),
      prisma.invoice.findMany({
        where: { companyId: authCtx.companyId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, invoiceNumber: true, clientName: true, status: true, updatedAt: true, sentAt: true, paidAt: true },
      }),
      prisma.job.findMany({
        where: { companyId: authCtx.companyId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true, updatedAt: true },
      }),

      // Revenue queries
      prisma.invoicePayment.findMany({
        where: { companyId: authCtx.companyId, receivedAt: { gte: thisMonthStart, lt: thisMonthEnd }, status: "succeeded" },
        select: { amount: true, receivedAt: true },
      }),
      prisma.invoicePayment.findMany({
        where: { companyId: authCtx.companyId, receivedAt: { gte: lastMonthStart, lt: thisMonthStart }, status: "succeeded" },
        select: { amount: true },
      }),

      // Team
      prisma.engineer.findMany({
        where: { companyId: authCtx.companyId },
        select: { id: true, email: true, name: true },
        take: 10,
      }).catch(() => []),
    ]);

    const msDb = stopDb();

    // -- Build KPI data --
    const openQuoteValue = quotesList.reduce((a: number, q: any) => a + Number(q.total || 0), 0);
    const draftQuotes = quotesList.filter((q: any) => q.status === "draft");
    const sentQuotes = quotesList.filter((q: any) => q.status === "sent");
    const unpaidTotal = invoices.reduce((a: number, i: any) => a + Number(i.total || 0), 0);
    const overdueCount = invoices.filter((i: any) => i.dueAt && new Date(i.dueAt) < now).length;

    const dashboardData = {
      counts: { jobs, quotes, timesheetsPendingApproval: timesheets },
      quotes: { pendingCount: quotesList.length, pendingValue: openQuoteValue, draftCount: draftQuotes.length, sentCount: sentQuotes.length },
      invoices: { unpaidCount: invoices.length, overdueCount, unpaidTotal },
      enquiries: { openCount: openEnquiries },
    };

    // -- Build activity feed --
    type ActivityItem = {
      id: string;
      type: string;
      description: string;
      entityId: string;
      entityType: string;
      timestamp: string;
      link: string;
    };
    const activities: ActivityItem[] = [];

    for (const event of auditEvents) {
      let activity: ActivityItem | null = null;
      if (event.entityType === "quote" && event.quoteId) {
        const cn = event.quote?.clientName || "a client";
        if (event.action === "sent") activity = { id: event.id, type: "quote_sent", description: `Quote sent to ${cn}`, entityId: event.quoteId, entityType: "quote", timestamp: event.createdAt.toISOString(), link: `/admin/quotes/${event.quoteId}` };
        else if (event.action === "accepted") activity = { id: event.id, type: "quote_accepted", description: `Quote accepted by ${cn}`, entityId: event.quoteId, entityType: "quote", timestamp: event.createdAt.toISOString(), link: `/admin/quotes/${event.quoteId}` };
      }
      if (event.entityType === "invoice" && event.invoiceId) {
        const num = event.invoice?.invoiceNumber || event.invoiceId.slice(0, 8);
        const cn = event.invoice?.clientName || "a client";
        if (event.action === "sent") activity = { id: event.id, type: "invoice_sent", description: `Invoice #${num} sent to ${cn}`, entityId: event.invoiceId, entityType: "invoice", timestamp: event.createdAt.toISOString(), link: `/admin/invoices/${event.invoiceId}` };
        else if (event.action === "paid") activity = { id: event.id, type: "invoice_paid", description: `Invoice #${num} marked as paid`, entityId: event.invoiceId, entityType: "invoice", timestamp: event.createdAt.toISOString(), link: `/admin/invoices/${event.invoiceId}` };
      }
      if (event.entityType === "job" && event.jobId) {
        const jt = event.job?.title || `Job ${event.jobId.slice(0, 8)}`;
        if (event.action === "completed") activity = { id: event.id, type: "job_completed", description: `${jt} completed`, entityId: event.jobId, entityType: "job", timestamp: event.createdAt.toISOString(), link: `/admin/jobs/${event.jobId}` };
        else if (event.action === "scheduled") activity = { id: event.id, type: "job_scheduled", description: `${jt} scheduled`, entityId: event.jobId, entityType: "job", timestamp: event.createdAt.toISOString(), link: `/admin/jobs/${event.jobId}` };
      }
      if (event.entityType === "certificate" && event.certificateId) {
        const certNum = event.certificate?.certificateNumber || event.certificateId.slice(0, 8);
        if (event.action === "issued" || event.action === "completed") activity = { id: event.id, type: "certificate_issued", description: `Certificate #${certNum} issued`, entityId: event.certificateId, entityType: "certificate", timestamp: event.createdAt.toISOString(), link: `/admin/certificates/${event.certificateId}` };
      }
      if (activity) activities.push(activity);
    }

    // Supplement with recent entities if needed
    if (activities.length < 10) {
      for (const q of recentQuotes) {
        if (activities.length >= 10) break;
        if (activities.some(a => a.entityId === q.id)) continue;
        if (q.status === "sent") activities.push({ id: `quote-${q.id}`, type: "quote_sent", description: `Quote sent to ${q.clientName}`, entityId: q.id, entityType: "quote", timestamp: q.updatedAt.toISOString(), link: `/admin/quotes/${q.id}` });
        else if (q.status === "accepted" && q.acceptedAt) activities.push({ id: `quote-${q.id}`, type: "quote_accepted", description: `Quote accepted by ${q.clientName}`, entityId: q.id, entityType: "quote", timestamp: q.acceptedAt.toISOString(), link: `/admin/quotes/${q.id}` });
      }
      for (const inv of recentInvoices) {
        if (activities.length >= 10) break;
        if (activities.some(a => a.entityId === inv.id)) continue;
        const num = inv.invoiceNumber || inv.id.slice(0, 8);
        if (inv.status === "paid" && inv.paidAt) activities.push({ id: `invoice-${inv.id}`, type: "invoice_paid", description: `Invoice #${num} marked as paid`, entityId: inv.id, entityType: "invoice", timestamp: inv.paidAt.toISOString(), link: `/admin/invoices/${inv.id}` });
        else if (inv.status === "sent" && inv.sentAt) activities.push({ id: `invoice-${inv.id}`, type: "invoice_sent", description: `Invoice #${num} sent to ${inv.clientName}`, entityId: inv.id, entityType: "invoice", timestamp: inv.sentAt.toISOString(), link: `/admin/invoices/${inv.id}` });
      }
      for (const job of recentJobs) {
        if (activities.length >= 10) break;
        if (activities.some(a => a.entityId === job.id)) continue;
        const jt = job.title || `Job ${job.id.slice(0, 8)}`;
        if (job.status === "completed") activities.push({ id: `job-${job.id}`, type: "job_completed", description: `${jt} completed`, entityId: job.id, entityType: "job", timestamp: job.updatedAt.toISOString(), link: `/admin/jobs/${job.id}` });
        else if (job.status === "scheduled") activities.push({ id: `job-${job.id}`, type: "job_scheduled", description: `${jt} scheduled`, entityId: job.id, entityType: "job", timestamp: job.updatedAt.toISOString(), link: `/admin/jobs/${job.id}` });
      }
    }
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // -- Build revenue data --
    const thisMonthTotal = thisMonthPayments.reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0);
    const lastMonthTotal = lastMonthPayments.reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0);
    let percentChange = 0;
    if (lastMonthTotal > 0) percentChange = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);
    else if (thisMonthTotal > 0) percentChange = 100;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyRevenue: Array<{ date: string; amount: number }> = [];
    for (let day = 1; day <= daysInMonth; day++) {
      dailyRevenue.push({ date: new Date(currentYear, currentMonth, day).toISOString().split("T")[0], amount: 0 });
    }
    for (const p of thisMonthPayments) {
      const d = p.receivedAt.getDate();
      if (d >= 1 && d <= daysInMonth) dailyRevenue[d - 1].amount += p.amount || 0;
    }
    const maxDaily = Math.max(...dailyRevenue.map(d => d.amount), 1);

    const revenueData = {
      thisMonth: { total: Math.round(thisMonthTotal * 100) / 100, monthName: thisMonthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) },
      lastMonth: { total: Math.round(lastMonthTotal * 100) / 100, monthName: lastMonthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) },
      percentChange,
      dailyRevenue: dailyRevenue.map(d => ({ ...d, amount: Math.round(d.amount * 100) / 100, percentage: Math.round((d.amount / maxDaily) * 100) })),
      maxDailyRevenue: Math.round(maxDaily * 100) / 100,
    };

    const json = {
      ok: true,
      data: dashboardData,
      activities: activities.slice(0, 10),
      revenue: revenueData,
      engineers,
    };

    cache.set(cacheKey, { json, expiresAt: Date.now() + CACHE_TTL_MS });

    logPerf("dashboard_summary", { msTotal: stopTotal(), msDb, ok: true, cacheHit: false });

    return NextResponse.json(json);
  } catch (error: any) {
    logPerf("dashboard_summary", { msTotal: stopTotal(), ok: false });
    if (error?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    logError(error, { route: "/api/admin/dashboard/summary", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
