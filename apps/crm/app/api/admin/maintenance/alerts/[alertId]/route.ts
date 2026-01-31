import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export const PATCH = withRequestLogging(async function PATCH(req: Request, ctx: { params: Promise<{ alertId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { alertId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (body.status !== undefined) {
      const valid = ["open", "ack", "dismissed", "sent"];
      if (!valid.includes(body.status)) {
        return NextResponse.json({ ok: false, error: "invalid status" }, { status: 400 });
      }
      data.status = body.status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "nothing to update" }, { status: 400 });
    }

    const result = await prisma.maintenanceAlert.updateMany({
      where: { id: alertId, companyId: authCtx.companyId },
      data,
    });
    if (result.count === 0) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const updated = await prisma.maintenanceAlert.findFirst({ where: { id: alertId, companyId: authCtx.companyId } });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});

export const DELETE = withRequestLogging(async function DELETE(_req: Request, ctx: { params: Promise<{ alertId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { alertId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const result = await prisma.maintenanceAlert.deleteMany({ where: { id: alertId, companyId: authCtx.companyId } });
    if (result.count === 0) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
});
