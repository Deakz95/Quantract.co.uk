export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

type ActivityItem = {
  id: string;
  type: "quote_sent" | "quote_accepted" | "invoice_sent" | "invoice_paid" | "job_completed" | "job_scheduled" | "certificate_issued" | "general";
  description: string;
  entityId: string;
  entityType: string;
  timestamp: string;
  link: string;
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

    // Fetch recent audit events
    const auditEvents = await prisma.auditEvent.findMany({
      where: {
        companyId: authCtx.companyId,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        quote: {
          select: { id: true, clientName: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, clientName: true },
        },
        job: {
          select: { id: true, title: true },
        },
        certificate: {
          select: { id: true, certificateNumber: true },
        },
      },
    });

    // Also fetch recent jobs, quotes, invoices if audit events are sparse
    const [recentQuotes, recentInvoices, recentJobs] = await Promise.all([
      prisma.quote.findMany({
        where: { companyId: authCtx.companyId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          clientName: true,
          status: true,
          updatedAt: true,
          acceptedAt: true,
        },
      }),
      prisma.invoice.findMany({
        where: { companyId: authCtx.companyId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          clientName: true,
          status: true,
          updatedAt: true,
          sentAt: true,
          paidAt: true,
        },
      }),
      prisma.job.findMany({
        where: { companyId: authCtx.companyId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
        },
      }),
    ]);

    const activities: ActivityItem[] = [];

    // Process audit events
    for (const event of auditEvents) {
      let activity: ActivityItem | null = null;

      if (event.entityType === "quote" && event.quoteId) {
        const clientName = event.quote?.clientName || "a client";
        if (event.action === "sent") {
          activity = {
            id: event.id,
            type: "quote_sent",
            description: `Quote sent to ${clientName}`,
            entityId: event.quoteId,
            entityType: "quote",
            timestamp: event.createdAt.toISOString(),
            link: `/admin/quotes/${event.quoteId}`,
          };
        } else if (event.action === "accepted") {
          activity = {
            id: event.id,
            type: "quote_accepted",
            description: `Quote accepted by ${clientName}`,
            entityId: event.quoteId,
            entityType: "quote",
            timestamp: event.createdAt.toISOString(),
            link: `/admin/quotes/${event.quoteId}`,
          };
        }
      }

      if (event.entityType === "invoice" && event.invoiceId) {
        const invoiceNum = event.invoice?.invoiceNumber || event.invoiceId.slice(0, 8);
        const clientName = event.invoice?.clientName || "a client";
        if (event.action === "sent") {
          activity = {
            id: event.id,
            type: "invoice_sent",
            description: `Invoice #${invoiceNum} sent to ${clientName}`,
            entityId: event.invoiceId,
            entityType: "invoice",
            timestamp: event.createdAt.toISOString(),
            link: `/admin/invoices/${event.invoiceId}`,
          };
        } else if (event.action === "paid") {
          activity = {
            id: event.id,
            type: "invoice_paid",
            description: `Invoice #${invoiceNum} marked as paid`,
            entityId: event.invoiceId,
            entityType: "invoice",
            timestamp: event.createdAt.toISOString(),
            link: `/admin/invoices/${event.invoiceId}`,
          };
        }
      }

      if (event.entityType === "job" && event.jobId) {
        const jobTitle = event.job?.title || `Job ${event.jobId.slice(0, 8)}`;
        if (event.action === "completed") {
          activity = {
            id: event.id,
            type: "job_completed",
            description: `${jobTitle} completed`,
            entityId: event.jobId,
            entityType: "job",
            timestamp: event.createdAt.toISOString(),
            link: `/admin/jobs/${event.jobId}`,
          };
        } else if (event.action === "scheduled") {
          activity = {
            id: event.id,
            type: "job_scheduled",
            description: `${jobTitle} scheduled`,
            entityId: event.jobId,
            entityType: "job",
            timestamp: event.createdAt.toISOString(),
            link: `/admin/jobs/${event.jobId}`,
          };
        }
      }

      if (event.entityType === "certificate" && event.certificateId) {
        const certNum = event.certificate?.certificateNumber || event.certificateId.slice(0, 8);
        if (event.action === "issued" || event.action === "completed") {
          activity = {
            id: event.id,
            type: "certificate_issued",
            description: `Certificate #${certNum} issued`,
            entityId: event.certificateId,
            entityType: "certificate",
            timestamp: event.createdAt.toISOString(),
            link: `/admin/certificates/${event.certificateId}`,
          };
        }
      }

      if (activity) {
        activities.push(activity);
      }
    }

    // If we don't have enough audit events, supplement with recent entity updates
    if (activities.length < 10) {
      // Add recent quote activities
      for (const quote of recentQuotes) {
        if (activities.length >= 10) break;
        if (activities.some(a => a.entityId === quote.id)) continue;

        if (quote.status === "sent") {
          activities.push({
            id: `quote-${quote.id}`,
            type: "quote_sent",
            description: `Quote sent to ${quote.clientName}`,
            entityId: quote.id,
            entityType: "quote",
            timestamp: quote.updatedAt.toISOString(),
            link: `/admin/quotes/${quote.id}`,
          });
        } else if (quote.status === "accepted" && quote.acceptedAt) {
          activities.push({
            id: `quote-${quote.id}`,
            type: "quote_accepted",
            description: `Quote accepted by ${quote.clientName}`,
            entityId: quote.id,
            entityType: "quote",
            timestamp: quote.acceptedAt.toISOString(),
            link: `/admin/quotes/${quote.id}`,
          });
        }
      }

      // Add recent invoice activities
      for (const invoice of recentInvoices) {
        if (activities.length >= 10) break;
        if (activities.some(a => a.entityId === invoice.id)) continue;

        const invoiceNum = invoice.invoiceNumber || invoice.id.slice(0, 8);
        if (invoice.status === "paid" && invoice.paidAt) {
          activities.push({
            id: `invoice-${invoice.id}`,
            type: "invoice_paid",
            description: `Invoice #${invoiceNum} marked as paid`,
            entityId: invoice.id,
            entityType: "invoice",
            timestamp: invoice.paidAt.toISOString(),
            link: `/admin/invoices/${invoice.id}`,
          });
        } else if (invoice.status === "sent" && invoice.sentAt) {
          activities.push({
            id: `invoice-${invoice.id}`,
            type: "invoice_sent",
            description: `Invoice #${invoiceNum} sent to ${invoice.clientName}`,
            entityId: invoice.id,
            entityType: "invoice",
            timestamp: invoice.sentAt.toISOString(),
            link: `/admin/invoices/${invoice.id}`,
          });
        }
      }

      // Add recent job activities
      for (const job of recentJobs) {
        if (activities.length >= 10) break;
        if (activities.some(a => a.entityId === job.id)) continue;

        const jobTitle = job.title || `Job ${job.id.slice(0, 8)}`;
        if (job.status === "completed") {
          activities.push({
            id: `job-${job.id}`,
            type: "job_completed",
            description: `${jobTitle} completed`,
            entityId: job.id,
            entityType: "job",
            timestamp: job.updatedAt.toISOString(),
            link: `/admin/jobs/${job.id}`,
          });
        } else if (job.status === "scheduled") {
          activities.push({
            id: `job-${job.id}`,
            type: "job_scheduled",
            description: `${jobTitle} scheduled`,
            entityId: job.id,
            entityType: "job",
            timestamp: job.updatedAt.toISOString(),
            link: `/admin/jobs/${job.id}`,
          });
        }
      }
    }

    // Sort by timestamp (most recent first) and take top 10
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const topActivities = activities.slice(0, 10);

    return NextResponse.json({
      ok: true,
      activities: topActivities,
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/dashboard/activity", action: "get" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/dashboard/activity", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
