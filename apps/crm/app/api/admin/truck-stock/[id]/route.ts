import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/** PATCH: update a truck stock record by id — supports { delta } or { qty, minQty } */
export const PATCH = withRequestLogging(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    // Verify record belongs to this company
    const existing = await prisma.truckStock.findFirst({
      where: { id, companyId: authCtx.companyId },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const update: any = {};

    if (typeof body.delta === "number") {
      // Delta adjustment mode
      update.qty = Math.max(0, existing.qty + body.delta);

      // Also log the adjustment
      try {
        await prisma.truckStockLog.create({
          data: {
            companyId: authCtx.companyId,
            userId: existing.userId,
            stockItemId: existing.stockItemId,
            qtyDelta: body.delta,
            reason: body.reason || null,
            jobId: body.jobId || null,
          },
        });
      } catch {
        // Log creation is best-effort
      }
    } else {
      if (typeof body.qty === "number") update.qty = Math.max(0, body.qty);
      if (typeof body.minQty === "number") update.minQty = Math.max(0, body.minQty);

      // Log absolute set
      if (typeof body.qty === "number") {
        const delta = Math.max(0, body.qty) - existing.qty;
        try {
          await prisma.truckStockLog.create({
            data: {
              companyId: authCtx.companyId,
              userId: existing.userId,
              stockItemId: existing.stockItemId,
              qtyDelta: delta,
              reason: body.reason || "set",
              jobId: body.jobId || null,
            },
          });
        } catch {
          // best-effort
        }
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: "nothing_to_update" }, { status: 400 });
    }

    const record = await prisma.truckStock.update({
      where: { id },
      data: update,
      include: {
        stockItem: { select: { id: true, name: true, sku: true, unit: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, data: record });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[PATCH /api/admin/truck-stock/[id]]", e);
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});

/** DELETE: remove a truck stock record by id */
export const DELETE = withRequestLogging(async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    // Verify record belongs to this company
    const existing = await prisma.truckStock.findFirst({
      where: { id, companyId: authCtx.companyId },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Log the deletion before removing the record
    try {
      await prisma.truckStockLog.create({
        data: {
          companyId: authCtx.companyId,
          userId: existing.userId,
          stockItemId: existing.stockItemId,
          qtyDelta: -existing.qty,
          reason: "delete",
          jobId: null,
        },
      });
    } catch {
      // best-effort
    }

    await prisma.truckStock.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[DELETE /api/admin/truck-stock/[id]]", e);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
});
