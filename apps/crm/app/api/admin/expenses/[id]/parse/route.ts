export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = rateLimit({ key: `ocr-parse:${ip}`, limit: 20, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ ok:false, error:{ code:"RATE_LIMIT", message:"Too many requests" }},{ status:429 });

  const ctx = await requireCapability("expenses.manage");
  const prisma = p();

  const expense = await prisma.expense.findFirst({
    where: { id: (await params).id, companyId: ctx.companyId },
    include: { attachment: true }
  });

  if (!expense) {
    return NextResponse.json({ ok:false, error:{ code:"NOT_FOUND", message:"Expense not found" }},{ status:404 });
  }

  // Simulated OCR: create deterministic-ish demo data
  const now = new Date();
  const parsed = await prisma.expense.update({
    where: { id: expense.id },
    data: {
      status: "PARSED",
      supplierName: expense.supplierName ?? "Unknown Supplier",
      receiptDate: expense.receiptDate ?? now,
      currency: expense.currency ?? "GBP",
      subtotal: expense.subtotal ?? 10000,
      vat: expense.vat ?? 2000,
      total: expense.total ?? 12000
    },
    include: { attachment: true }
  });

  return NextResponse.json({ ok: true, data: parsed });
}
