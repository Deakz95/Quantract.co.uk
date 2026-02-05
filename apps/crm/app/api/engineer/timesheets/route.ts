import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "engineer" && effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const url = new URL(req.url);
    const weekStartParam = url.searchParams.get("weekStart");
    const weekStart = getWeekStart(weekStartParam ? new Date(weekStartParam) : new Date());

    // Find engineer
    const engineer = await client.engineer.findFirst({
      where: {
        companyId: authCtx.companyId,
        OR: [{ email: authCtx.email }, { users: { some: { id: authCtx.userId } } }],
      },
    });

    if (!engineer) {
      return NextResponse.json({ ok: true, timesheet: null, entries: [] });
    }

    // Get or create timesheet
    let timesheet = await client.timesheet.findFirst({
      where: {
        companyId: authCtx.companyId,
        engineerId: engineer.id,
        weekStart,
      },
    });

    if (!timesheet) {
      timesheet = await client.timesheet.create({
        data: {
          companyId: authCtx.companyId,
          engineerId: engineer.id,
          weekStart,
          status: "draft",
        },
      });
    }

    // Get time entries for this week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const entries = await client.timeEntry.findMany({
      where: {
        companyId: authCtx.companyId,
        engineerId: engineer.id,
        startedAt: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { startedAt: "asc" },
      include: {
        job: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ ok: true, timesheet, entries: entries || [] });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/engineer/timesheets", action: "get" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/engineer/timesheets", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "engineer" && effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const weekStartParam = body.weekStart;
    const weekStart = getWeekStart(weekStartParam ? new Date(weekStartParam) : new Date());

    // Find engineer
    const engineer = await client.engineer.findFirst({
      where: {
        companyId: authCtx.companyId,
        OR: [{ email: authCtx.email }, { users: { some: { id: authCtx.userId } } }],
      },
    });

    if (!engineer) {
      return NextResponse.json({ ok: false, error: "engineer_not_found" }, { status: 404 });
    }

    // Check if timesheet already exists and is locked (approved)
    const existing = await client.timesheet.findFirst({
      where: {
        companyId: authCtx.companyId,
        engineerId: engineer.id,
        weekStart,
      },
      select: { status: true },
    });

    if (existing?.status === "approved") {
      return NextResponse.json(
        { ok: false, error: "Timesheet already approved and locked" },
        { status: 409 },
      );
    }

    // Find or create timesheet and submit it
    const timesheet = await client.timesheet.upsert({
      where: {
        companyId_engineerId_weekStart: {
          companyId: authCtx.companyId,
          engineerId: engineer.id,
          weekStart,
        },
      },
      update: {
        status: "submitted",
        submittedAt: new Date(),
      },
      create: {
        companyId: authCtx.companyId,
        engineerId: engineer.id,
        weekStart,
        status: "submitted",
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, timesheet });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/engineer/timesheets", action: "submit" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/engineer/timesheets", action: "submit" });
    return NextResponse.json({ ok: false, error: "submit_failed" }, { status: 500 });
  }
});
