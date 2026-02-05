export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

type Alert = {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  link: string;
  entityId?: string;
};

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

    const alerts: Alert[] = [];

    // Rule 1: Overdue scheduled checks
    const overdueChecks = await prisma.scheduledCheck.findMany({
      where: { companyId: cid, status: "overdue" },
      include: { asset: { select: { name: true } } },
      take: 20,
    });
    for (const check of overdueChecks) {
      alerts.push({
        id: `check-${check.id}`,
        type: "overdue_check",
        severity: "critical",
        title: "Overdue check",
        description: `${check.title}${check.asset ? ` — ${check.asset.name}` : ""} was due ${new Date(check.dueAt).toLocaleDateString("en-GB")}`,
        link: "/admin/scheduled-checks",
        entityId: check.id,
      });
    }

    // Rule 2: Overdue invoices
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        companyId: cid,
        deletedAt: null,
        status: "sent",
        dueAt: { lt: now },
      },
      select: { id: true, invoiceNumber: true, clientName: true, total: true, dueAt: true },
      take: 20,
    });
    for (const inv of overdueInvoices) {
      alerts.push({
        id: `inv-${inv.id}`,
        type: "overdue_invoice",
        severity: "warning",
        title: "Overdue invoice",
        description: `${inv.invoiceNumber || "Draft"} — ${inv.clientName} — £${inv.total.toFixed(2)} due ${inv.dueAt ? new Date(inv.dueAt).toLocaleDateString("en-GB") : "N/A"}`,
        link: `/admin/invoices/${inv.id}`,
        entityId: inv.id,
      });
    }

    // Rule 3: Unbilled completed jobs
    const unbilledJobs = await prisma.job.findMany({
      where: {
        companyId: cid,
        deletedAt: null,
        status: "completed",
        invoices: { none: {} },
      },
      select: { id: true, title: true, jobNumber: true, budgetTotal: true },
      take: 10,
    });
    for (const job of unbilledJobs) {
      alerts.push({
        id: `unbilled-${job.id}`,
        type: "unbilled_job",
        severity: "warning",
        title: "Unbilled completed job",
        description: `${job.jobNumber ? `#${job.jobNumber}` : "Job"} — ${job.title || "Untitled"} — £${job.budgetTotal.toFixed(2)}`,
        link: `/admin/jobs/${job.id}`,
        entityId: job.id,
      });
    }

    // Rule 4: Unresolved certificate observations
    const unresolvedObs = await prisma.certificateObservation.count({
      where: { companyId: cid, resolvedAt: null },
    });
    if (unresolvedObs > 0) {
      alerts.push({
        id: "unresolved-obs",
        type: "unresolved_observations",
        severity: "info",
        title: "Unresolved observations",
        description: `${unresolvedObs} certificate observation${unresolvedObs > 1 ? "s" : ""} pending resolution`,
        link: "/admin/certificates",
      });
    }

    // Rule 5: Pending timesheets older than 3 days
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
    const staleTimesheets = await prisma.timesheet.count({
      where: {
        companyId: cid,
        status: "submitted",
        submittedAt: { lt: threeDaysAgo },
      },
    });
    if (staleTimesheets > 0) {
      alerts.push({
        id: "stale-timesheets",
        type: "stale_timesheets",
        severity: "info",
        title: "Timesheets awaiting review",
        description: `${staleTimesheets} timesheet${staleTimesheets > 1 ? "s" : ""} submitted more than 3 days ago`,
        link: "/admin/office/approvals",
      });
    }

    // Sort by severity (critical first)
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return NextResponse.json({
      ok: true,
      alerts,
      counts: {
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
        total: alerts.length,
      },
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/office/alerts", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
