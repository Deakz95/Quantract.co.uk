import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(_req: Request, ctx: { params: Promise<{ assetId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const { assetId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const asset = await prisma.installedAsset.findFirst({
      where: { id: assetId, companyId: authCtx.companyId },
      include: {
        client: { select: { id: true, name: true } },
        job: { select: { id: true, title: true } },
        alerts: { orderBy: { dueAt: "desc" }, take: 20 },
      },
    });

    if (!asset) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: asset });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const PATCH = withRequestLogging(async function PATCH(req: Request, ctx: { params: Promise<{ assetId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { assetId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type;
    if (body.manufacturer !== undefined) data.manufacturer = body.manufacturer;
    if (body.model !== undefined) data.model = body.model;
    if (body.serial !== undefined) data.serial = body.serial;
    if (body.installedAt !== undefined) data.installedAt = body.installedAt ? new Date(body.installedAt) : null;
    if (body.nextServiceAt !== undefined) data.nextServiceAt = body.nextServiceAt ? new Date(body.nextServiceAt) : null;
    if (body.meta !== undefined) data.meta = body.meta;

    const asset = await prisma.installedAsset.updateMany({
      where: { id: assetId, companyId: authCtx.companyId },
      data,
    });

    if (asset.count === 0) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const updated = await prisma.installedAsset.findFirst({ where: { id: assetId, companyId: authCtx.companyId } });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});

export const DELETE = withRequestLogging(async function DELETE(_req: Request, ctx: { params: Promise<{ assetId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { assetId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    await prisma.maintenanceAlert.deleteMany({ where: { assetId, companyId: authCtx.companyId } });
    const result = await prisma.installedAsset.deleteMany({ where: { id: assetId, companyId: authCtx.companyId } });
    if (result.count === 0) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    return NextResponse.json({ ok: true, deleted: true });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
});
