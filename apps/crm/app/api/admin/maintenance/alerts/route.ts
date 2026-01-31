import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCapability("maintenance.view");

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const assetId = url.searchParams.get("assetId") || undefined;

    const where: any = { companyId: authCtx.companyId };
    if (status) where.status = status;
    if (assetId) where.assetId = assetId;

    const alerts = await prisma.maintenanceAlert.findMany({
      where,
      orderBy: { dueAt: "asc" },
      take: 200,
      include: {
        asset: { select: { id: true, name: true, type: true } },
        rule: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, data: alerts });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCapability("maintenance.manage");

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => null);
    if (!body?.assetId || !body?.message) {
      return NextResponse.json({ ok: false, error: "assetId and message are required" }, { status: 400 });
    }

    const asset = await prisma.installedAsset.findFirst({
      where: { id: body.assetId, companyId: authCtx.companyId },
    });
    if (!asset) return NextResponse.json({ ok: false, error: "asset_not_found" }, { status: 404 });

    const alert = await prisma.maintenanceAlert.create({
      data: {
        companyId: authCtx.companyId,
        assetId: body.assetId,
        ruleId: body.ruleId || null,
        status: "open",
        dueAt: body.dueAt ? new Date(body.dueAt) : new Date(),
        message: body.message,
        meta: body.meta || null,
      },
    });

    return NextResponse.json({ ok: true, data: alert }, { status: 201 });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
