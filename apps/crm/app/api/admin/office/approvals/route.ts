export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import * as repo from "@/lib/server/repo";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const url = new URL(req.url);
    const filter = url.searchParams.get("filter") || "all"; // all | timesheets | expenses

    const [timesheets, expenses] = await Promise.all([
      filter === "expenses"
        ? Promise.resolve([])
        : prisma.timesheet.findMany({
            where: { companyId: cid, status: "submitted" },
            include: {
              engineer: { select: { id: true, name: true, email: true } },
              timeEntries: {
                select: { startedAt: true, endedAt: true, breakMinutes: true, jobId: true },
              },
            },
            orderBy: { weekStart: "desc" },
            take: 50,
          }),
      filter === "timesheets"
        ? Promise.resolve([])
        : prisma.expense.findMany({
            where: { companyId: cid, status: { in: ["UPLOADED", "PARSED"] } },
            include: {
              supplier: { select: { id: true, name: true } },
              createdBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
    ]);

    // Normalize into a unified list
    const items: Array<{
      id: string;
      type: "timesheet" | "expense";
      label: string;
      sublabel: string;
      status: string;
      date: string;
      amount?: string;
    }> = [];

    for (const ts of timesheets) {
      let totalHours = 0;
      for (const e of ts.timeEntries) {
        if (!e.endedAt) continue;
        const ms = new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime();
        totalHours += ms / 3600000 - (e.breakMinutes || 0) / 60;
      }
      items.push({
        id: ts.id,
        type: "timesheet",
        label: ts.engineer?.name || ts.engineer?.email || "Engineer",
        sublabel: `Week of ${new Date(ts.weekStart).toLocaleDateString("en-GB")} — ${totalHours.toFixed(1)}h`,
        status: ts.status,
        date: ts.submittedAt?.toISOString() || ts.createdAt.toISOString(),
      });
    }

    for (const exp of expenses) {
      items.push({
        id: exp.id,
        type: "expense",
        label: exp.supplierName || exp.supplier?.name || "Unknown supplier",
        sublabel: exp.category || "Uncategorised",
        status: exp.status,
        date: exp.createdAt.toISOString(),
        amount: exp.total != null ? `£${(exp.total / 100).toFixed(2)}` : undefined,
      });
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      ok: true,
      items,
      counts: {
        timesheets: timesheets.length,
        expenses: expenses.length,
        total: items.length,
      },
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/office/approvals", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/** Bulk approve timesheets and/or confirm expenses */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const body = await req.json();
    const { action, ids } = body as { action: "approve" | "reject"; ids: Array<{ id: string; type: "timesheet" | "expense" }> };

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
    }

    let approved = 0;
    let rejected = 0;
    let failed = 0;
    const failedItems: Array<{ id: string; type: string; reason: string }> = [];

    for (const item of ids) {
      try {
        if (item.type === "timesheet") {
          if (action === "approve") {
            await prisma.timesheet.update({
              where: { id: item.id, companyId: cid },
              data: { status: "approved", approvedAt: new Date(), approvedBy: authCtx.userId },
            });
            approved++;
            try {
              await repo.recordAuditEvent({
                entityType: "timesheet",
                entityId: item.id,
                action: "timesheet.approved",
                actorRole: effectiveRole,
                actor: authCtx.email,
                meta: { bulk: true },
              });
            } catch { /* audit write failure is non-critical */ }
          } else {
            await prisma.timesheet.update({
              where: { id: item.id, companyId: cid },
              data: { status: "rejected" },
            });
            rejected++;
            try {
              await repo.recordAuditEvent({
                entityType: "timesheet",
                entityId: item.id,
                action: "timesheet.rejected",
                actorRole: effectiveRole,
                actor: authCtx.email,
                meta: { bulk: true },
              });
            } catch { /* audit write failure is non-critical */ }
          }
        } else if (item.type === "expense") {
          if (action === "approve") {
            // Enforce category before approval
            const expense = await prisma.expense.findUnique({
              where: { id: item.id, companyId: cid },
              select: { category: true },
            });
            if (!expense?.category) {
              failed++;
              failedItems.push({ id: item.id, type: "expense", reason: "missing_category" });
              continue;
            }
            await prisma.expense.update({
              where: { id: item.id, companyId: cid },
              data: { status: "CONFIRMED" },
            });
            approved++;
            try {
              await repo.recordAuditEvent({
                entityType: "expense",
                entityId: item.id,
                action: "expense.confirmed",
                actorRole: effectiveRole,
                actor: authCtx.email,
                meta: { bulk: true },
              });
            } catch { /* audit write failure is non-critical */ }
          } else {
            // For reject, set back to UPLOADED (no dedicated rejected status yet)
            await prisma.expense.update({
              where: { id: item.id, companyId: cid },
              data: { status: "UPLOADED" },
            });
            rejected++;
            try {
              await repo.recordAuditEvent({
                entityType: "expense",
                entityId: item.id,
                action: "expense.rejected",
                actorRole: effectiveRole,
                actor: authCtx.email,
                meta: { bulk: true },
              });
            } catch { /* audit write failure is non-critical */ }
          }
        }
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      approved,
      rejected,
      failed,
      ...(failedItems.length > 0 ? { failedItems } : {}),
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/office/approvals", action: "bulk" });
    return NextResponse.json({ ok: false, error: "action_failed" }, { status: 500 });
  }
});
