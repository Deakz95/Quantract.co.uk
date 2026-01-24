export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCapability("expenses.manage");
  const prisma = p();
  const body = await req.json();

  const expense = await prisma.expense.findFirst({
    where: { id: (await params).id, companyId: ctx.companyId }
  });

  if (!expense) {
    return NextResponse.json({ ok:false, error:{ code:"NOT_FOUND", message:"Expense not found" }},{ status:404 });
  }

  const updated = await prisma.expense.update({
    where: { id: expense.id },
    data: {
      status: "CONFIRMED",
      supplierName: body.supplierName ?? expense.supplierName,
      receiptDate: body.receiptDate ? new Date(body.receiptDate) : expense.receiptDate,
      currency: body.currency ?? expense.currency,
      subtotal: body.subtotal ?? expense.subtotal,
      vat: body.vat ?? expense.vat,
      total: body.total ?? expense.total,
      category: body.category ?? expense.category,
      jobId: body.jobId ?? expense.jobId,
      notes: body.notes ?? expense.notes
    }
  });

  return NextResponse.json({ ok: true, data: updated });
}
