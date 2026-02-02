import { NextResponse } from "next/server";
import { requireRole, getUserEmail, requireCompanyContext } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/** POST: engineer consumes stock for their assigned job — transactional, idempotent */
export const POST = withRequestLogging(async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

    const { jobId } = await params;
    const authCtx = await requireCompanyContext();

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    // Verify engineer is assigned to this job
    const job = await repo.getJobForEngineer(jobId, email);
    if (!job) return NextResponse.json({ ok: false, error: "Job not found or not assigned to you." }, { status: 404 });

    // Get the actual job record with engineerId and stockConsumedAt
    const jobRecord = await prisma.job.findFirst({
      where: { id: jobId, companyId: authCtx.companyId },
    });
    if (!jobRecord) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Idempotency
    if (jobRecord.stockConsumedAt) {
      return NextResponse.json({ ok: true, alreadyConsumed: true, engineerId: jobRecord.engineerId });
    }

    const engineerId = jobRecord.engineerId;
    if (!engineerId) {
      return NextResponse.json({ ok: false, error: "No engineer assigned to this job." }, { status: 400 });
    }

    // Verify engineerId belongs to this company
    const engineer = await prisma.user.findFirst({
      where: { id: engineerId, companyId: authCtx.companyId },
    });
    if (!engineer) {
      return NextResponse.json({ ok: false, error: "Engineer not found." }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const lines = await tx.jobBudgetLine.findMany({
        where: { jobId, companyId: authCtx.companyId, stockItemId: { not: null } },
      });

      const consumed: Array<{ stockItemId: string; stockQty: number; description: string }> = [];
      const insufficient: Array<{ stockItemId: string; stockQty: number; available: number; description: string }> = [];

      for (const line of lines) {
        const stockQty = line.stockQty ?? 0;
        if (stockQty <= 0) continue;

        const truckStock = await tx.truckStock.findFirst({
          where: { companyId: authCtx.companyId, userId: engineerId, stockItemId: line.stockItemId },
        });

        if (!truckStock) {
          insufficient.push({ stockItemId: line.stockItemId!, stockQty, available: 0, description: line.description || "" });
          continue;
        }

        const available = truckStock.qty;
        if (available < stockQty) {
          insufficient.push({ stockItemId: line.stockItemId!, stockQty, available, description: line.description || "" });
          continue;
        }

        await tx.truckStock.update({ where: { id: truckStock.id }, data: { qty: available - stockQty } });
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

        consumed.push({ stockItemId: line.stockItemId!, stockQty, description: line.description || "" });
      }

      if (insufficient.length === 0 && consumed.length > 0) {
        await tx.job.update({ where: { id: jobId }, data: { stockConsumedAt: new Date() } });
      }

      return { consumed, insufficient };
    });

    return NextResponse.json({
      ok: true,
      engineerId,
      consumed: result.consumed,
      insufficient: result.insufficient,
      stockConsumedAt: result.insufficient.length === 0 && result.consumed.length > 0,
    });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[POST /api/engineer/jobs/[jobId]/consume-stock]", e);
    return NextResponse.json({ ok: false, error: "Could not consume stock. Please try again." }, { status: 500 });
  }
});
