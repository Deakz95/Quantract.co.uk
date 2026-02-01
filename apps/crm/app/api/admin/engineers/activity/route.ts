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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [engineers, lastActiveEntries, todaySchedule] = await Promise.all([
      prisma.engineer.findMany({
        where: { companyId, isActive: true },
        select: { id: true },
      }),

      // Most recent time entry per engineer
      prisma.timeEntry.groupBy({
        by: ["engineerId"],
        where: { companyId },
        _max: { startedAt: true },
      }),

      // Today's schedule entries per engineer
      prisma.scheduleEntry.groupBy({
        by: ["engineerId"],
        where: {
          companyId,
          startAt: { gte: todayStart, lte: todayEnd },
        },
        _count: true,
      }),
    ]);

    const lastActiveMap = new Map<string, string | null>(
      lastActiveEntries.map((e: { engineerId: string; _max: { startedAt: Date | null } }) => [e.engineerId, e._max.startedAt?.toISOString() ?? null])
    );
    const todayCountMap = new Map<string, number>(
      todaySchedule.map((e: { engineerId: string; _count: number }) => [e.engineerId, e._count])
    );

    const activity: Record<string, { lastActive: string | null; todayJobCount: number }> = {};
    for (const eng of engineers) {
      activity[eng.id] = {
        lastActive: lastActiveMap.get(eng.id) ?? null,
        todayJobCount: todayCountMap.get(eng.id) ?? 0,
      };
    }

    return NextResponse.json({ ok: true, activity });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
