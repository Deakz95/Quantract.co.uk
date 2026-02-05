import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { logCriticalAction } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export const PATCH = withRequestLogging(async function PATCH(
  req: Request,
  ctx: { params: Promise<{ entryId: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const { entryId } = await getRouteParams(ctx);

    const existing = await prisma.scheduleEntry.findFirst({
      where: { id: entryId, companyId: cid, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (body.startAtISO) {
      const d = new Date(body.startAtISO);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, error: "invalid_start" }, { status: 400 });
      }
      data.startAt = d;
    }
    if (body.endAtISO) {
      const d = new Date(body.endAtISO);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, error: "invalid_end" }, { status: 400 });
      }
      data.endAt = d;
    }
    if (body.engineerId) {
      // Validate engineer belongs to same company
      const eng = await prisma.engineer.findFirst({
        where: { id: body.engineerId, companyId: cid },
      });
      if (!eng) {
        return NextResponse.json({ ok: false, error: "engineer_not_found" }, { status: 400 });
      }
      data.engineerId = body.engineerId;
    }
    if (body.notes !== undefined) {
      data.notes = body.notes || null;
    }
    if (body.status) {
      const validStatuses = ["scheduled", "en_route", "on_site", "in_progress", "completed"];
      if (validStatuses.includes(body.status)) {
        data.status = body.status;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
    }

    // Resolve final values for clash check
    const finalStart = (data.startAt as Date) ?? existing.startAt;
    const finalEnd = (data.endAt as Date) ?? existing.endAt;
    const finalEngineerId = (data.engineerId as string) ?? existing.engineerId;

    if (finalEnd <= finalStart) {
      return NextResponse.json({ ok: false, error: "end_before_start" }, { status: 400 });
    }

    // Capacity validation: check engineer working hours + travel buffer
    const engineer = await prisma.engineer.findFirst({
      where: { id: finalEngineerId, companyId: cid },
      select: { workStartHour: true, workEndHour: true, breakMinutes: true, maxJobsPerDay: true, travelBufferMinutes: true },
    });
    if (engineer) {
      const startHour = finalStart.getHours() + finalStart.getMinutes() / 60;
      const endHour = finalEnd.getHours() + finalEnd.getMinutes() / 60;
      if (startHour < engineer.workStartHour || endHour > engineer.workEndHour) {
        return NextResponse.json(
          { ok: false, error: "outside_working_hours", workStartHour: engineer.workStartHour, workEndHour: engineer.workEndHour },
          { status: 422 },
        );
      }

      // Break overlap check (soft warning — overridable with force: true)
      const breakMinutes = engineer.breakMinutes ?? 30;
      if (breakMinutes > 0 && !body.force) {
        const workMid = (engineer.workStartHour + engineer.workEndHour) / 2;
        const breakStartH = workMid - breakMinutes / 60 / 2;
        const breakEndH = breakStartH + breakMinutes / 60;
        if (startHour < breakEndH && endHour > breakStartH) {
          return NextResponse.json(
            { ok: false, error: "overlaps_break", breakStart: breakStartH, breakEnd: breakEndH, overridable: true },
            { status: 422 },
          );
        }
      }
    }

    // Travel buffer: inflate search window by buffer minutes after each entry
    const bufferMs = (engineer?.travelBufferMinutes ?? 0) * 60_000;

    // Clash check: find overlapping entries for the same engineer (exclude self), including travel buffer
    const others = await prisma.scheduleEntry.findMany({
      where: {
        companyId: cid,
        engineerId: finalEngineerId,
        deletedAt: null,
        id: { not: entryId },
        startAt: { lt: new Date(finalEnd.getTime() + bufferMs) },
        endAt: { gt: new Date(finalStart.getTime() - bufferMs) },
      },
    });

    if (others.length > 0) {
      // Distinguish hard clashes from travel buffer violations
      const hardClash = others.some((o: { startAt: Date; endAt: Date }) =>
        o.startAt.getTime() < finalEnd.getTime() && o.endAt.getTime() > finalStart.getTime()
      );
      return NextResponse.json(
        {
          ok: false,
          error: hardClash ? "clash" : "travel_buffer_violation",
          travelBufferMinutes: engineer?.travelBufferMinutes,
          clashWith: others.map((o: { id: string; startAt: Date; endAt: Date }) => ({ id: o.id, startAt: o.startAt.toISOString(), endAt: o.endAt.toISOString() })),
        },
        { status: hardClash ? 409 : 422 },
      );
    }

    // maxJobsPerDay check
    if (engineer?.maxJobsPerDay) {
      const dayStart = new Date(finalStart);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);
      const dayCount = await prisma.scheduleEntry.count({
        where: {
          companyId: cid,
          engineerId: finalEngineerId,
          deletedAt: null,
          id: { not: entryId },
          startAt: { gte: dayStart, lt: dayEnd },
        },
      });
      if (dayCount >= engineer.maxJobsPerDay) {
        return NextResponse.json(
          { ok: false, error: "max_jobs_exceeded", maxJobsPerDay: engineer.maxJobsPerDay, currentCount: dayCount },
          { status: 422 },
        );
      }
    }

    const updated = await prisma.scheduleEntry.update({
      where: { id: entryId },
      data: data as any,
      include: { engineer: true, job: { select: { id: true, title: true } } },
    });

    logCriticalAction({
      name: "schedule.entry.updated",
      companyId: cid,
      metadata: { scheduleEntryId: entryId, changes: Object.keys(data) },
    });

    return NextResponse.json({
      ok: true,
      entry: {
        id: updated.id,
        jobId: updated.jobId,
        engineerId: updated.engineerId,
        engineerEmail: (updated as any).engineer?.email,
        engineerName: (updated as any).engineer?.name,
        startAtISO: updated.startAt.toISOString(),
        endAtISO: updated.endAt.toISOString(),
        notes: updated.notes,
        status: updated.status,
        jobTitle: (updated as any).job?.title,
      },
    });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/schedule/[entryId]", action: "patch" });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});

export const DELETE = withRequestLogging(async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ entryId: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const { entryId } = await getRouteParams(ctx);

    // Soft-delete: set deletedAt timestamp (non-destructive)
    const entry = await prisma.scheduleEntry.findFirst({
      where: { id: entryId, companyId: cid, deletedAt: null },
    });
    if (!entry) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    await prisma.scheduleEntry.update({
      where: { id: entryId },
      data: { deletedAt: new Date() },
    });

    logCriticalAction({
      name: "schedule.entry.soft_deleted",
      companyId: cid,
      metadata: { scheduleEntryId: entryId, jobId: entry.jobId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/schedule/[entryId]", action: "delete" });
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
});
