export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { timeStart, logPerf } from "@/lib/perf/timing";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AttentionItem = {
  id: string;
  type:
    | "job_no_invoice"
    | "invoice_overdue"
    | "missing_timesheet"
    | "cert_not_issued"
    | "open_snags"
    | "quote_no_job";
  icon: string;
  message: string;
  age: string;
  urgency: number;
  ctaLabel: string;
  ctaHref: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(date: Date): number {
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function ageText(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// ---------------------------------------------------------------------------
// In-memory TTL cache keyed by companyId
// ---------------------------------------------------------------------------

const cache = new Map<string, { json: object; expiresAt: number }>();
const CACHE_TTL_MS = 30_000;

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const GET = withRequestLogging(async function GET() {
  const stopTotal = timeStart("dashboard_attention_total");

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
      logPerf("dashboard_attention", { msTotal: stopTotal(), ok: true, cacheHit: true });
      return NextResponse.json(cached.json);
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const companyId = authCtx.companyId;
    const stopDb = timeStart("dashboard_attention_db");

    // Run all 6 queries in parallel
    const [
      completedJobsNoInvoice,
      overdueInvoices,
      unsubmittedTimeData,
      certsNotIssued,
      openSnagsByJob,
      acceptedQuotesNoJob,
    ] = await Promise.all([
      // 1. job_no_invoice: completed jobs with no linked invoice, updated > 3 days ago
      prisma.job.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: "completed",
          updatedAt: { lt: threeDaysAgo },
          invoices: { none: { deletedAt: null } },
        },
        select: { id: true, jobNumber: true, updatedAt: true },
        orderBy: { updatedAt: "asc" },
        take: 6,
      }),

      // 2. invoice_overdue: sent invoices past due date
      prisma.invoice.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: "sent",
          dueAt: { not: null, lt: now },
        },
        select: { id: true, invoiceNumber: true, clientName: true, dueAt: true },
        orderBy: { dueAt: "asc" },
        take: 6,
      }),

      // 3. missing_timesheet: engineers with time entries in past 7 days but no
      //    submitted/approved timesheet covering the same weekStart
      prisma.timeEntry.findMany({
        where: {
          companyId,
          startedAt: { gte: sevenDaysAgo },
          OR: [
            { timesheetId: null },
            {
              timesheet: {
                status: { notIn: ["submitted", "approved"] },
              },
            },
          ],
        },
        select: {
          engineerId: true,
          engineer: { select: { name: true, email: true } },
        },
      }),

      // 4. cert_not_issued: completed certificates not yet issued, completedAt > 2 days ago
      prisma.certificate.findMany({
        where: {
          companyId,
          status: "completed",
          issuedAt: null,
          completedAt: { not: null, lt: twoDaysAgo },
        },
        select: { id: true, certificateNumber: true, completedAt: true },
        orderBy: { completedAt: "asc" },
        take: 6,
      }),

      // 5. open_snags: open snag items on completed jobs, grouped by job
      prisma.snagItem.findMany({
        where: {
          companyId,
          status: "open",
          job: { status: "completed", deletedAt: null },
        },
        select: {
          id: true,
          jobId: true,
          job: { select: { id: true, jobNumber: true, updatedAt: true } },
        },
      }),

      // 6. quote_no_job: accepted quotes with no linked job, acceptedAt > 2 days ago
      prisma.quote.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: "accepted",
          acceptedAt: { not: null, lt: twoDaysAgo },
          jobs: { none: { deletedAt: null } },
        },
        select: { id: true, quoteNumber: true, acceptedAt: true },
        orderBy: { acceptedAt: "asc" },
        take: 6,
      }),
    ]);

    const msDb = stopDb();

    // ---------------------------------------------------------------------------
    // Build attention items
    // ---------------------------------------------------------------------------

    const items: AttentionItem[] = [];

    // 1. job_no_invoice
    for (const job of completedJobsNoInvoice) {
      const days = daysAgo(job.updatedAt);
      items.push({
        id: `job_no_invoice_${job.id}`,
        type: "job_no_invoice",
        icon: "file-text",
        message: `Job #${job.jobNumber ?? job.id.slice(0, 8)} completed — no invoice created`,
        age: ageText(days),
        urgency: days,
        ctaLabel: "Create invoice",
        ctaHref: `/admin/jobs/${job.id}`,
      });
    }

    // 2. invoice_overdue
    for (const inv of overdueInvoices) {
      const days = daysAgo(inv.dueAt!);
      items.push({
        id: `invoice_overdue_${inv.id}`,
        type: "invoice_overdue",
        icon: "clock",
        message: `Invoice #${inv.invoiceNumber ?? inv.id.slice(0, 8)} to ${inv.clientName} is overdue`,
        age: `${days} day${days === 1 ? "" : "s"} overdue`,
        urgency: days + 10,
        ctaLabel: "Chase payment",
        ctaHref: `/admin/invoices/${inv.id}`,
      });
    }

    // 3. missing_timesheet — deduplicate by engineerId
    const seenEngineers = new Set<string>();
    for (const entry of unsubmittedTimeData) {
      if (seenEngineers.has(entry.engineerId)) continue;
      seenEngineers.add(entry.engineerId);
      const name = entry.engineer?.name || entry.engineer?.email || "Unknown engineer";
      items.push({
        id: `missing_timesheet_${entry.engineerId}`,
        type: "missing_timesheet",
        icon: "clock",
        message: `${name} has unsubmitted time entries`,
        age: "past 7 days",
        urgency: 5,
        ctaLabel: "Review timesheets",
        ctaHref: "/admin/timesheets",
      });
    }

    // 4. cert_not_issued
    for (const cert of certsNotIssued) {
      const days = daysAgo(cert.completedAt!);
      items.push({
        id: `cert_not_issued_${cert.id}`,
        type: "cert_not_issued",
        icon: "shield",
        message: `Certificate #${cert.certificateNumber ?? cert.id.slice(0, 8)} completed — not yet issued`,
        age: ageText(days),
        urgency: days,
        ctaLabel: "Issue certificate",
        ctaHref: `/admin/certificates/${cert.id}`,
      });
    }

    // 5. open_snags — group by job
    const snagsByJob = new Map<string, { job: (typeof openSnagsByJob)[0]["job"]; count: number }>();
    for (const snag of openSnagsByJob) {
      const existing = snagsByJob.get(snag.jobId);
      if (existing) {
        existing.count++;
      } else {
        snagsByJob.set(snag.jobId, { job: snag.job, count: 1 });
      }
    }
    for (const [jobId, { job, count }] of snagsByJob) {
      const days = daysAgo(job.updatedAt);
      items.push({
        id: `open_snags_${jobId}`,
        type: "open_snags",
        icon: "alert-circle",
        message: `Job #${job.jobNumber ?? jobId.slice(0, 8)} has ${count} open snag${count === 1 ? "" : "s"}`,
        age: ageText(days),
        urgency: days,
        ctaLabel: "Review snags",
        ctaHref: `/admin/jobs/${jobId}`,
      });
    }

    // 6. quote_no_job
    for (const quote of acceptedQuotesNoJob) {
      const days = daysAgo(quote.acceptedAt!);
      items.push({
        id: `quote_no_job_${quote.id}`,
        type: "quote_no_job",
        icon: "briefcase",
        message: `Quote #${quote.quoteNumber ?? quote.id.slice(0, 8)} accepted — no job created`,
        age: ageText(days),
        urgency: days,
        ctaLabel: "Create job",
        ctaHref: `/admin/quotes/${quote.id}`,
      });
    }

    // Sort by urgency descending, take top 6
    items.sort((a, b) => b.urgency - a.urgency);
    const topItems = items.slice(0, 6);

    const json = { ok: true, items: topItems };

    cache.set(cacheKey, { json, expiresAt: Date.now() + CACHE_TTL_MS });

    logPerf("dashboard_attention", { msTotal: stopTotal(), msDb, ok: true, cacheHit: false, totalItems: items.length });

    return NextResponse.json(json);
  } catch (error: any) {
    logPerf("dashboard_attention", { msTotal: stopTotal(), ok: false });
    if (error?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (error?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    logError(error, { route: "/api/admin/dashboard/attention", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
