import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "engineer" && authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!authCtx.email) {
      return NextResponse.json({ ok: false, error: "missing_engineer_context" }, { status: 401 });
    }

    if (!authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 401 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const url = new URL(req.url);
    const now = new Date();
    const from = parseDateParam(url.searchParams.get("from"), new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const to = parseDateParam(url.searchParams.get("to"), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));

    // Find the engineer record
    const engineer = await client.engineer.findFirst({
      where: {
        companyId: authCtx.companyId,
        OR: [
          { email: authCtx.email },
          { userId: authCtx.userId },
        ],
      },
    });

    if (!engineer) {
      return NextResponse.json({ ok: true, from: from.toISOString(), to: to.toISOString(), entries: [], clashes: [] });
    }

    const entries = await client.scheduleEntry.findMany({
      where: {
        companyId: authCtx.companyId,
        engineerId: engineer.id,
        startAt: { gte: from, lte: to },
      },
      orderBy: { startAt: "asc" },
      include: {
        job: { select: { id: true, title: true } },
      },
    });

    const mappedEntries = entries.map((e: any) => ({
      id: e.id,
      startAtISO: e.startAt.toISOString(),
      endAtISO: e.endAt.toISOString(),
      jobId: e.jobId,
      jobTitle: e.job?.title,
      notes: e.notes,
    }));

    const clashes: Array<{ aId: string; bId: string }> = [];
    const sorted = [...mappedEntries].sort((a, b) => (a.startAtISO > b.startAtISO ? 1 : -1));
    for (let i = 0; i < sorted.length; i += 1) {
      const a = sorted[i];
      const aS = new Date(a.startAtISO).getTime();
      const aE = new Date(a.endAtISO).getTime();
      if (!Number.isFinite(aS) || !Number.isFinite(aE)) continue;
      for (let j = i + 1; j < sorted.length; j += 1) {
        const b = sorted[j];
        const bS = new Date(b.startAtISO).getTime();
        const bE = new Date(b.endAtISO).getTime();
        if (!Number.isFinite(bS) || !Number.isFinite(bE)) continue;
        if (bS >= aE) break;
        if (overlaps(aS, aE, bS, bE)) {
          clashes.push({ aId: a.id, bId: b.id });
        }
      }
    }

    return NextResponse.json({ ok: true, from: from.toISOString(), to: to.toISOString(), entries: mappedEntries, clashes });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/engineer/schedule", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/engineer/schedule", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
