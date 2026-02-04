import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { formatAuditDescription, formatAction } from "@/lib/auditLabels";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);

    // Authorization: only admins and office staff can view activity feeds
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const type = searchParams.get("type") || "all";
    const skip = (page - 1) * limit;
    const companyId = authCtx.companyId;

    // Verify the target user belongs to this company (prevents IDOR)
    const targetUser = await prisma.companyUser.findFirst({
      where: { companyId, OR: [{ userId }, { id: userId }] },
      select: { userId: true, email: true },
    });

    // Also check if this is an engineer ID
    const targetEngineer = await prisma.engineer.findFirst({
      where: { companyId, id: userId },
      select: { id: true, email: true },
    });

    if (!targetUser && !targetEngineer) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    const engineerId = targetEngineer?.id ?? null;
    const actorId = targetUser?.userId ?? null;
    const items: any[] = [];

    // Fetch audit events (jobs, certs, invoices, quotes)
    if (type === "all" || type === "jobs" || type === "certs") {
      const entityFilter =
        type === "jobs" ? { entityType: { in: ["job"] } } :
        type === "certs" ? { entityType: { in: ["certificate"] } } :
        {};

      const events = await prisma.auditEvent.findMany({
        where: {
          companyId,
          ...(actorId ? { actor: actorId } : { actor: engineerId ?? "__none__" }),
          ...entityFilter,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          actorRole: true,
          createdAt: true,
          job: { select: { id: true, title: true } },
          quote: { select: { id: true, clientName: true } },
          invoice: { select: { id: true, invoiceNumber: true, clientName: true } },
          certificate: { select: { id: true, certificateNumber: true } },
        },
      });

      for (const e of events) {
        items.push({
          id: e.id,
          type: "audit",
          entityType: e.entityType,
          action: formatAction(e.action),
          description: formatAuditDescription({
            entityType: e.entityType,
            action: e.action,
            job: e.job,
            quote: e.quote,
            invoice: e.invoice,
            certificate: e.certificate,
          }),
          entityId: e.entityId,
          linkedEntity: e.job
            ? { type: "job", id: e.job.id, label: e.job.title }
            : e.certificate
              ? { type: "certificate", id: e.certificate.id, label: `#${e.certificate.certificateNumber}` }
              : e.invoice
                ? { type: "invoice", id: e.invoice.id, label: `#${e.invoice.invoiceNumber}` }
                : e.quote
                  ? { type: "quote", id: e.quote.id, label: e.quote.clientName }
                  : null,
          timestamp: e.createdAt.toISOString(),
        });
      }
    }

    // Fetch timesheet entries
    if ((type === "all" || type === "timesheets") && engineerId) {
      const timeEntries = await prisma.timeEntry.findMany({
        where: { companyId, engineerId },
        orderBy: { startedAt: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          breakMinutes: true,
          status: true,
          notes: true,
          job: { select: { id: true, title: true } },
        },
      });

      for (const te of timeEntries) {
        const hours = te.endedAt
          ? ((te.endedAt.getTime() - te.startedAt.getTime()) / 3600000 - te.breakMinutes / 60).toFixed(1)
          : null;

        items.push({
          id: te.id,
          type: "timesheet",
          entityType: "time_entry",
          action: "Logged time",
          description: `${hours ? hours + "h" : "In progress"} on ${te.job?.title ?? "job"}`,
          entityId: te.job?.id ?? null,
          linkedEntity: te.job
            ? { type: "job", id: te.job.id, label: te.job.title }
            : null,
          timestamp: te.startedAt.toISOString(),
        });
      }
    }

    // Sort combined items by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit to merged results
    const pagedItems = items.slice(0, limit);

    return NextResponse.json({ ok: true, items: pagedItems, page, limit });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    console.error("[staff/activity] Error:", err);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
