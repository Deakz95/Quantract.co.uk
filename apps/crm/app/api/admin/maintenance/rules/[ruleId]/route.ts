import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(_req: Request, ctx: { params: Promise<{ ruleId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const { ruleId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const rule = await prisma.maintenanceRule.findFirst({
      where: { id: ruleId, companyId: authCtx.companyId },
    });
    if (!rule) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: rule });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const PATCH = withRequestLogging(async function PATCH(req: Request, ctx: { params: Promise<{ ruleId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const { ruleId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.assetType !== undefined) data.assetType = body.assetType;
    if (body.intervalDays !== undefined) data.intervalDays = body.intervalDays ? Number(body.intervalDays) : null;
    if (body.action !== undefined) data.action = body.action;

    const result = await prisma.maintenanceRule.updateMany({
      where: { id: ruleId, companyId: authCtx.companyId },
      data,
    });
    if (result.count === 0) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const updated = await prisma.maintenanceRule.findFirst({ where: { id: ruleId, companyId: authCtx.companyId } });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});

export const DELETE = withRequestLogging(async function DELETE(_req: Request, ctx: { params: Promise<{ ruleId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

    const { ruleId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const result = await prisma.maintenanceRule.deleteMany({ where: { id: ruleId, companyId: authCtx.companyId } });
    if (result.count === 0) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
});
