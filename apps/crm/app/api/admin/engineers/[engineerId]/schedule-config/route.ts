import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(
  _req: Request,
  ctx: { params: Promise<{ engineerId: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const { engineerId } = await getRouteParams(ctx);

    const eng = await prisma.engineer.findFirst({
      where: { id: engineerId, companyId: cid },
      select: {
        id: true,
        name: true,
        workStartHour: true,
        workEndHour: true,
        breakMinutes: true,
        maxJobsPerDay: true,
        travelBufferMinutes: true,
      },
    });

    if (!eng) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, config: eng });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/engineers/[engineerId]/schedule-config", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const PUT = withRequestLogging(async function PUT(
  req: Request,
  ctx: { params: Promise<{ engineerId: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const { engineerId } = await getRouteParams(ctx);

    const eng = await prisma.engineer.findFirst({
      where: { id: engineerId, companyId: cid },
    });
    if (!eng) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.workStartHour === "number" && body.workStartHour >= 0 && body.workStartHour <= 23) {
      data.workStartHour = body.workStartHour;
    }
    if (typeof body.workEndHour === "number" && body.workEndHour >= 1 && body.workEndHour <= 24) {
      data.workEndHour = body.workEndHour;
    }
    if (typeof body.breakMinutes === "number" && body.breakMinutes >= 0 && body.breakMinutes <= 120) {
      data.breakMinutes = body.breakMinutes;
    }
    if (body.maxJobsPerDay === null || (typeof body.maxJobsPerDay === "number" && body.maxJobsPerDay >= 0)) {
      data.maxJobsPerDay = body.maxJobsPerDay;
    }
    if (typeof body.travelBufferMinutes === "number" && body.travelBufferMinutes >= 0 && body.travelBufferMinutes <= 120) {
      data.travelBufferMinutes = body.travelBufferMinutes;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
    }

    // Validate workEndHour > workStartHour
    const finalStart = (data.workStartHour as number) ?? eng.workStartHour;
    const finalEnd = (data.workEndHour as number) ?? eng.workEndHour;
    if (finalEnd <= finalStart) {
      return NextResponse.json({ ok: false, error: "end_before_start" }, { status: 400 });
    }

    const updated = await prisma.engineer.update({
      where: { id: engineerId },
      data: data as any,
      select: {
        id: true,
        name: true,
        workStartHour: true,
        workEndHour: true,
        breakMinutes: true,
        maxJobsPerDay: true,
        travelBufferMinutes: true,
      },
    });

    return NextResponse.json({ ok: true, config: updated });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/engineers/[engineerId]/schedule-config", action: "put" });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});
