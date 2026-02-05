import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError, logCriticalAction } from "@/lib/server/observability";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/admin/dispatch/recurring/generate
 *
 * Generates ScheduleEntry records from active RecurringSchedule rules
 * for a given target week. Idempotent — skips dates that already have
 * an entry for the same engineer+job on that day.
 *
 * Body: { targetWeekStart: ISO date string (Monday) }
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const body = await req.json().catch(() => ({}));

    const targetWeekStart = body.targetWeekStart ? new Date(body.targetWeekStart) : null;
    if (!targetWeekStart || isNaN(targetWeekStart.getTime())) {
      return NextResponse.json(
        { ok: false, error: "targetWeekStart required (ISO date)" },
        { status: 400 },
      );
    }

    // Get all active recurring rules for this company
    const rules = await prisma.recurringSchedule.findMany({
      where: {
        companyId: cid,
        validFrom: { lte: new Date(targetWeekStart.getTime() + 7 * 86_400_000) },
        OR: [
          { validUntil: null },
          { validUntil: { gte: targetWeekStart } },
        ],
      },
    });

    if (rules.length === 0) {
      return NextResponse.json({ ok: true, created: 0, message: "no_matching_rules" });
    }

    // Build the 7 days of the target week
    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      weekDates.push(new Date(targetWeekStart.getTime() + i * 86_400_000));
    }

    // Get existing entries for the week to avoid duplicates
    const weekEnd = new Date(targetWeekStart.getTime() + 7 * 86_400_000);
    const existingEntries = await prisma.scheduleEntry.findMany({
      where: {
        companyId: cid,
        deletedAt: null,
        startAt: { gte: targetWeekStart, lt: weekEnd },
      },
      select: { engineerId: true, jobId: true, startAt: true },
    });

    // Build a set of "engineerId:jobId:YYYY-MM-DD" for dedup
    const existingKeys = new Set(
      existingEntries.map((e: { engineerId: string; jobId: string; startAt: Date }) => {
        const dateKey = e.startAt.toISOString().slice(0, 10);
        return `${e.engineerId}:${e.jobId || ""}:${dateKey}`;
      }),
    );

    const toCreate: Array<{
      id: string;
      companyId: string;
      jobId: string;
      engineerId: string;
      startAt: Date;
      endAt: Date;
      notes: string | null;
      status: string;
    }> = [];

    for (const rule of rules) {
      const pattern = (rule as any).pattern as string;
      const startTime = (rule as any).startTime as string;
      const durationMinutes = (rule as any).durationMinutes as number;

      // Parse start time "HH:MM"
      const [hours, mins] = startTime.split(":").map(Number);
      if (isNaN(hours) || isNaN(mins)) continue;

      // Determine which days this rule applies to
      let matchDays: number[] = [];
      if (pattern.startsWith("weekly:")) {
        matchDays = pattern.slice(7).split(",").map(Number);
      }
      // Monthly patterns not handled for weekly generation

      for (const date of weekDates) {
        const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...
        if (!matchDays.includes(dayOfWeek)) continue;

        // Check validFrom/validUntil
        if (date < (rule as any).validFrom) continue;
        if ((rule as any).validUntil && date > (rule as any).validUntil) continue;

        const startAt = new Date(date);
        startAt.setHours(hours, mins, 0, 0);
        const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

        // Idempotency: skip if already exists
        const key = `${(rule as any).engineerId}:${(rule as any).jobId || ""}:${date.toISOString().slice(0, 10)}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key); // prevent duplicates within same batch

        toCreate.push({
          id: randomUUID(),
          companyId: cid,
          jobId: (rule as any).jobId || "",
          engineerId: (rule as any).engineerId,
          startAt,
          endAt,
          notes: (rule as any).notes || null,
          status: "scheduled",
        });
      }
    }

    if (toCreate.length === 0) {
      return NextResponse.json({ ok: true, created: 0, message: "all_entries_already_exist" });
    }

    // Filter out entries without a jobId (can't create ScheduleEntry without jobId)
    const valid = toCreate.filter((e) => e.jobId);

    if (valid.length > 0) {
      await prisma.$transaction(
        valid.map((entry) =>
          prisma.scheduleEntry.create({ data: entry as any }),
        ),
      );
    }

    logCriticalAction({
      name: "dispatch.recurring.created",
      companyId: cid,
      metadata: {
        action: "generate",
        targetWeekStart: targetWeekStart.toISOString(),
        rulesMatched: rules.length,
        entriesCreated: valid.length,
        skippedNoJob: toCreate.length - valid.length,
      },
    });

    return NextResponse.json({
      ok: true,
      created: valid.length,
      targetWeekStart: targetWeekStart.toISOString(),
    });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/dispatch/recurring/generate", action: "post" });
    return NextResponse.json({ ok: false, error: "generate_failed" }, { status: 500 });
  }
});
