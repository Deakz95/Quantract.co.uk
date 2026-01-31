import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { isFeatureEnabled } from "@/lib/server/featureFlags";

export const runtime = "nodejs";

/** GET: list truck stock for a user (or all users if admin) */
export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const company = await prisma.company.findUnique({ where: { id: authCtx.companyId }, select: { plan: true } });
    if (!isFeatureEnabled(company?.plan, "truck_inventory")) {
      return NextResponse.json({ ok: false, error: "feature_not_available", upgrade: true }, { status: 403 });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || undefined;
    const lowStock = url.searchParams.get("lowStock") === "true";

    const where: any = { companyId: authCtx.companyId };
    if (role === "engineer") {
      where.userId = authCtx.userId;
    } else if (userId) {
      where.userId = userId;
    }

    const items = await prisma.truckStock.findMany({
      where,
      include: {
        stockItem: { select: { id: true, name: true, sku: true, unit: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = lowStock ? items.filter((i: any) => i.qty <= i.minQty) : items;
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/** POST: set or adjust truck stock for a user+item */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => null);
    if (!body?.stockItemId) {
      return NextResponse.json({ ok: false, error: "stockItemId is required" }, { status: 400 });
    }

    const targetUserId = role === "engineer" ? authCtx.userId : (body.userId || authCtx.userId);

    if (body.qtyDelta !== undefined) {
      // Adjust mode
      const existing = await prisma.truckStock.findUnique({
        where: { companyId_userId_stockItemId: { companyId: authCtx.companyId, userId: targetUserId, stockItemId: body.stockItemId } },
      });
      const currentQty = existing?.qty || 0;
      const newQty = Math.max(0, currentQty + Number(body.qtyDelta));

      const record = await prisma.truckStock.upsert({
        where: { companyId_userId_stockItemId: { companyId: authCtx.companyId, userId: targetUserId, stockItemId: body.stockItemId } },
        update: { qty: newQty },
        create: {
          companyId: authCtx.companyId,
          userId: targetUserId,
          stockItemId: body.stockItemId,
          qty: newQty,
          minQty: body.minQty || 0,
        },
      });

      await prisma.truckStockLog.create({
        data: {
          companyId: authCtx.companyId,
          userId: targetUserId,
          stockItemId: body.stockItemId,
          qtyDelta: Number(body.qtyDelta),
          reason: body.reason || null,
          jobId: body.jobId || null,
        },
      });

      return NextResponse.json({ ok: true, data: record });
    } else if (body.qty !== undefined) {
      // Set absolute mode
      const record = await prisma.truckStock.upsert({
        where: { companyId_userId_stockItemId: { companyId: authCtx.companyId, userId: targetUserId, stockItemId: body.stockItemId } },
        update: { qty: Math.max(0, Number(body.qty)), minQty: body.minQty !== undefined ? Number(body.minQty) : undefined },
        create: {
          companyId: authCtx.companyId,
          userId: targetUserId,
          stockItemId: body.stockItemId,
          qty: Math.max(0, Number(body.qty)),
          minQty: body.minQty || 0,
        },
      });
      return NextResponse.json({ ok: true, data: record });
    }

    return NextResponse.json({ ok: false, error: "qty or qtyDelta required" }, { status: 400 });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[POST /api/admin/truck-stock]", e);
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});
