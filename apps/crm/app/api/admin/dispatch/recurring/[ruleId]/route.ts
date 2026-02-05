import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError, logCriticalAction } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export const DELETE = withRequestLogging(async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ ruleId: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const { ruleId } = await getRouteParams(ctx);

    const rule = await prisma.recurringSchedule.findFirst({
      where: { id: ruleId, companyId: cid },
    });
    if (!rule) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    await prisma.recurringSchedule.delete({ where: { id: ruleId } });

    logCriticalAction({
      name: "dispatch.recurring.deleted",
      companyId: cid,
      metadata: { recurringScheduleId: ruleId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/dispatch/recurring/[ruleId]", action: "delete" });
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
});

export const PUT = withRequestLogging(async function PUT(
  req: Request,
  ctx: { params: Promise<{ ruleId: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const { ruleId } = await getRouteParams(ctx);

    const rule = await prisma.recurringSchedule.findFirst({
      where: { id: ruleId, companyId: cid },
    });
    if (!rule) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (body.pattern) data.pattern = String(body.pattern);
    if (body.startTime) data.startTime = String(body.startTime);
    if (typeof body.durationMinutes === "number") data.durationMinutes = body.durationMinutes;
    if (body.engineerId) {
      const eng = await prisma.engineer.findFirst({ where: { id: body.engineerId, companyId: cid } });
      if (!eng) return NextResponse.json({ ok: false, error: "engineer_not_found" }, { status: 400 });
      data.engineerId = body.engineerId;
    }
    if (body.validUntil !== undefined) {
      data.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    }
    if (body.notes !== undefined) {
      data.notes = body.notes || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
    }

    const updated = await prisma.recurringSchedule.update({
      where: { id: ruleId },
      data: data as any,
    });

    logCriticalAction({
      name: "dispatch.recurring.updated",
      companyId: cid,
      metadata: { recurringScheduleId: ruleId, changes: Object.keys(data) },
    });

    return NextResponse.json({ ok: true, rule: updated });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/dispatch/recurring/[ruleId]", action: "put" });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});
