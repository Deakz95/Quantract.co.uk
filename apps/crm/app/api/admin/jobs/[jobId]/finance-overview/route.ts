export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const ctx = await requireRole("admin");
    const prisma = p();

    const job = await prisma.job.findFirst({
      where: { id: (await params).jobId, companyId: ctx.companyId },
      include: {
        invoices: true,
        costItems: true,
        jobBudgetLines: true,
      },
    });

    if (!job) {
      return NextResponse.json({ ok: false, error: { message: "Not found" } }, { status: 404 });
    }

    const budgetTotal = job.jobBudgetLines.reduce((a: number, b: any) => a + Number(b.total || 0), 0);
    const actualCost = job.costItems.reduce((a: number, c: any) => a + Number(c.amount || 0), 0);
    const invoiced = job.invoices.reduce((a: number, i: any) => a + Number(i.total || 0), 0);
    const contractValue = job.budgetTotal || 0;

    return NextResponse.json({
      ok: true,
      data: {
        job: { id: job.id, name: job.title, status: job.status },
        revenue: { contractValue, invoicedToDate: invoiced },
        costs: { budgetTotal, actualCost },
        forecast: { forecastMargin: contractValue - actualCost },
      },
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "forbidden" }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
