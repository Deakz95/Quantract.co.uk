import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError, logCriticalAction } from "@/lib/server/observability";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

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

    const sourceWeekStart = body.sourceWeekStart ? new Date(body.sourceWeekStart) : null;
    const targetWeekStart = body.targetWeekStart ? new Date(body.targetWeekStart) : null;

    if (!sourceWeekStart || !targetWeekStart || isNaN(sourceWeekStart.getTime()) || isNaN(targetWeekStart.getTime())) {
      return NextResponse.json(
        { ok: false, error: "sourceWeekStart and targetWeekStart required (ISO dates)" },
        { status: 400 },
      );
    }

    const sourceEnd = new Date(sourceWeekStart.getTime() + 7 * 86_400_000);
    const dayOffset = targetWeekStart.getTime() - sourceWeekStart.getTime();

    // Find all entries in source week
    const sourceEntries = await prisma.scheduleEntry.findMany({
      where: {
        companyId: cid,
        deletedAt: null,
        startAt: { gte: sourceWeekStart, lt: sourceEnd },
      },
    });

    if (sourceEntries.length === 0) {
      return NextResponse.json({ ok: false, error: "no_entries_in_source_week" }, { status: 400 });
    }

    // Create copies offset to target week
    const created = await prisma.$transaction(
      sourceEntries.map((entry: any) =>
        prisma.scheduleEntry.create({
          data: {
            id: randomUUID(),
            companyId: cid,
            jobId: entry.jobId,
            engineerId: entry.engineerId,
            startAt: new Date(entry.startAt.getTime() + dayOffset),
            endAt: new Date(entry.endAt.getTime() + dayOffset),
            notes: entry.notes,
            status: "scheduled",
          },
        }),
      ),
    );

    logCriticalAction({
      name: "dispatch.copy_week",
      companyId: cid,
      metadata: {
        sourceWeekStart: sourceWeekStart.toISOString(),
        targetWeekStart: targetWeekStart.toISOString(),
        entriesCopied: created.length,
      },
    });

    return NextResponse.json({
      ok: true,
      copied: created.length,
      sourceWeekStart: sourceWeekStart.toISOString(),
      targetWeekStart: targetWeekStart.toISOString(),
    });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/dispatch/copy-week", action: "post" });
    return NextResponse.json({ ok: false, error: "copy_failed" }, { status: 500 });
  }
});
