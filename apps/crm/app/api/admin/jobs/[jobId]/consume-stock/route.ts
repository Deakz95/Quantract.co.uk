import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/** POST: consume stock for a job — transactional, idempotent via stockConsumedAt */
export const POST = withRequestLogging(async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => null);
    const engineerId = body?.engineerId;
    if (!engineerId || typeof engineerId !== "string") {
      return NextResponse.json({ ok: false, error: "engineerId required" }, { status: 400 });
    }

    // Verify job belongs to company
    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId: authCtx.companyId },
    });
    if (!job) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Idempotency: already consumed
    if (job.stockConsumedAt) {
      return NextResponse.json({ ok: true, alreadyConsumed: true, engineerId });
    }

    // Verify engineerId belongs to this company
    const engineer = await prisma.user.findFirst({
      where: { id: engineerId, companyId: authCtx.companyId },
    });
    if (!engineer) {
      return NextResponse.json({ ok: false, error: "engineer_not_found" }, { status: 404 });
    }

    // Run inside a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Load budget lines with stock mappings
      const lines = await tx.jobBudgetLine.findMany({
        where: {
          jobId,
          companyId: authCtx.companyId,
          stockItemId: { not: null },
        },
      });

      const consumed: Array<{ stockItemId: string; stockQty: number; description: string }> = [];
      const insufficient: Array<{ stockItemId: string; stockQty: number; available: number; description: string }> = [];

      for (const line of lines) {
        const stockQty = line.stockQty ?? 0;
        if (stockQty <= 0) continue;

        // Find TruckStock record for this engineer + stock item
        const truckStock = await tx.truckStock.findFirst({
          where: {
            companyId: authCtx.companyId,
            userId: engineerId,
            stockItemId: line.stockItemId,
          },
        });

        if (!truckStock) {
          insufficient.push({
            stockItemId: line.stockItemId!,
            stockQty,
            available: 0,
            description: line.description || "",
          });
          continue;
        }

        const available = truckStock.qty;

        if (available < stockQty) {
          insufficient.push({
            stockItemId: line.stockItemId!,
            stockQty,
            available,
            description: line.description || "",
          });
          continue;
        }

        // Deduct stock
        await tx.truckStock.update({
          where: { id: truckStock.id },
          data: { qty: available - stockQty },
        });

        // Log the deduction
        await tx.truckStockLog.create({
          data: {
            companyId: authCtx.companyId,
            userId: engineerId,
            stockItemId: line.stockItemId!,
            qtyDelta: -stockQty,
            reason: "job_consume",
            jobId,
          },
        });

        consumed.push({
          stockItemId: line.stockItemId!,
          stockQty,
          description: line.description || "",
        });
      }

      // Only mark stockConsumedAt if ALL lines were consumed (no insufficient)
      if (insufficient.length === 0 && consumed.length > 0) {
        await tx.job.update({
          where: { id: jobId },
          data: { stockConsumedAt: new Date() },
        });
      }

      return { consumed, insufficient };
    });

    return NextResponse.json({
      ok: true,
      engineerId,
      consumed: result.consumed,
      insufficient: result.insufficient,
      stockConsumedAt: result.insufficient.length === 0 && result.consumed.length > 0 ? true : false,
    });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[POST /api/admin/jobs/[jobId]/consume-stock]", e);
    return NextResponse.json({ ok: false, error: "consume_failed" }, { status: 500 });
  }
});
