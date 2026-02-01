import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const companyId = authCtx.companyId;

    const [jobIds, invoiceJobIds, snagJobIds, unlinkedTimeEntryJobIds] = await Promise.all([
      // All active job IDs
      prisma.job.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true },
      }),

      // Job IDs that have at least one non-deleted invoice
      prisma.invoice.findMany({
        where: { companyId, deletedAt: null, jobId: { not: null } },
        select: { jobId: true },
        distinct: ["jobId"],
      }),

      // Job IDs that have at least one open snag
      prisma.snagItem.findMany({
        where: { companyId, status: "open" },
        select: { jobId: true },
        distinct: ["jobId"],
      }),

      // TODO: "missing timesheet" heuristic is ambiguous. Best-effort: find jobs
      // with time entries that are not linked to a submitted/approved timesheet.
      prisma.timeEntry.findMany({
        where: {
          companyId,
          OR: [
            { timesheetId: null },
            { timesheet: { status: { notIn: ["submitted", "approved"] } } },
          ],
        },
        select: { jobId: true },
        distinct: ["jobId"],
      }),
    ]);

    const invoiceSet = new Set(invoiceJobIds.map((i: { jobId: string | null }) => i.jobId).filter(Boolean));
    const snagSet = new Set(snagJobIds.map((s: { jobId: string }) => s.jobId));
    const missingTimesheetSet = new Set(unlinkedTimeEntryJobIds.map((t: { jobId: string }) => t.jobId));

    const flags: Record<string, { hasInvoice: boolean; hasOpenSnags: boolean; hasMissingTimesheet: boolean }> = {};

    for (const job of jobIds) {
      flags[job.id] = {
        hasInvoice: invoiceSet.has(job.id),
        hasOpenSnags: snagSet.has(job.id),
        hasMissingTimesheet: missingTimesheetSet.has(job.id),
      };
    }

    return NextResponse.json({ ok: true, flags });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
