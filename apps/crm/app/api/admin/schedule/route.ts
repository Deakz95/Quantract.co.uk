import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { logCriticalAction } from "@/lib/server/observability";

export const runtime = "nodejs";

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aEnd > bStart && aStart < bEnd;
}

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const cid = authCtx.companyId;
    const url = new URL(req.url);
    const now = new Date();
    const from = parseDateParam(url.searchParams.get("from"), new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const to = parseDateParam(url.searchParams.get("to"), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));

    const entries = await repo.listScheduleEntries(from.toISOString(), to.toISOString(), cid);

    // Clash detection (per engineer)
    const clashes: Array<{ engineerEmail?: string; aId: string; bId: string }> = [];
    const byEngineer = new Map<string, typeof entries>();
    for (const e of entries) {
      const key = (e.engineerEmail || e.engineerId).toLowerCase();
      const list = byEngineer.get(key) ?? [];
      list.push(e);
      byEngineer.set(key, list);
    }
    for (const [, list] of byEngineer.entries()) {
      const sorted = [...list].sort((a, b) => (a.startAtISO > b.startAtISO ? 1 : -1));
      for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i];
        const aS = new Date(a.startAtISO).getTime();
        const aE = new Date(a.endAtISO).getTime();
        for (let j = i + 1; j < sorted.length; j++) {
          const b = sorted[j];
          const bS = new Date(b.startAtISO).getTime();
          const bE = new Date(b.endAtISO).getTime();
          if (!overlaps(aS, aE, bS, bE)) {
            if (bS >= aE) break;
            continue;
          }
          clashes.push({ engineerEmail: sorted[i].engineerEmail, aId: a.id, bId: b.id });
        }
      }
    }

    return NextResponse.json({ ok: true, from: from.toISOString(), to: to.toISOString(), entries, clashes });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/schedule", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const cid = authCtx.companyId;
    const body = await req.json().catch(() => ({}));
    const jobId = String(body.jobId || "").trim();
    const engineerEmail = String(body.engineerEmail || "").trim().toLowerCase();
    const startAtISO = String(body.startAtISO || "").trim();
    const endAtISO = String(body.endAtISO || "").trim();
    const notes = body.notes ? String(body.notes) : undefined;
    if (!jobId || !engineerEmail || !startAtISO || !endAtISO) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const startAt = new Date(startAtISO);
    const endAt = new Date(endAtISO);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return NextResponse.json({ ok: false, error: "invalid_dates" }, { status: 400 });
    }

    // Resolve engineer by email for validation
    const prisma = getPrisma();
    const engineer = await prisma.engineer.findFirst({
      where: { companyId: cid, email: engineerEmail },
      select: { id: true, workStartHour: true, workEndHour: true, breakMinutes: true, maxJobsPerDay: true, travelBufferMinutes: true },
    });

    if (engineer) {
      const startHour = startAt.getUTCHours() + startAt.getUTCMinutes() / 60;
      const endHour = endAt.getUTCHours() + endAt.getUTCMinutes() / 60;

      // Working hours check — advisory only, don't block scheduling
      // Reasons: (1) engineers may have workStartHour/workEndHour = 0 from bad data,
      // (2) getUTCHours uses UTC while working hours are conceptual local time,
      // (3) blocking scheduling entirely defeats the purpose of the schedule board.
      const wStart = engineer.workStartHour ?? 8;
      const wEnd = engineer.workEndHour ?? 17;
      if (wStart > 0 && wEnd > 0 && (startHour < wStart || endHour > wEnd)) {
        console.warn(`[schedule] Entry outside working hours (${wStart}-${wEnd}) for engineer ${engineerEmail}`);
      }

      // Travel buffer: inflate existing entries by buffer minutes after their end time
      const bufferMs = (engineer.travelBufferMinutes ?? 0) * 60_000;

      // Clash check (including travel buffer)
      const clashWhere: any = {
        companyId: cid,
        engineerId: engineer.id,
        deletedAt: null,
        startAt: { lt: new Date(endAt.getTime() + bufferMs) },
        endAt: { gt: new Date(startAt.getTime() - bufferMs) },
      };
      const clashing = await prisma.scheduleEntry.findMany({ where: clashWhere });
      if (clashing.length > 0) {
        // Distinguish travel buffer violations from hard clashes
        const hardClash = clashing.some((o: { startAt: Date; endAt: Date }) =>
          o.startAt.getTime() < endAt.getTime() && o.endAt.getTime() > startAt.getTime()
        );
        return NextResponse.json(
          {
            ok: false,
            error: hardClash ? "clash" : "travel_buffer_violation",
            travelBufferMinutes: engineer.travelBufferMinutes,
            clashWith: clashing.map((o: { id: string; startAt: Date; endAt: Date }) => ({ id: o.id, startAt: o.startAt.toISOString(), endAt: o.endAt.toISOString() })),
          },
          { status: hardClash ? 409 : 422 },
        );
      }

      // maxJobsPerDay check
      if (engineer.maxJobsPerDay) {
        const dayStart = new Date(startAt);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 86_400_000);
        const dayCount = await prisma.scheduleEntry.count({
          where: {
            companyId: cid,
            engineerId: engineer.id,
            deletedAt: null,
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
    }

    const entry = await repo.createScheduleEntry({ jobId, engineerEmail, startAtISO, endAtISO, notes });
    if (!entry) return NextResponse.json({ ok: false, error: "Could not create" }, { status: 400 });
    logCriticalAction({
      name: "schedule.entry.created",
      companyId: cid,
      metadata: {
        scheduleEntryId: entry.id,
        jobId,
        engineerEmail,
        startAtISO,
        endAtISO,
      },
    });
    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/schedule", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
