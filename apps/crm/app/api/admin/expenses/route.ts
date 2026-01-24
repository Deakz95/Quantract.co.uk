export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const ctx = await requireRole("admin");
    if (!ctx?.companyId) return NextResponse.json({ ok: true, data: [] });

    const items = await prisma.expense.findMany({
      where: { companyId: ctx.companyId },
      include: { supplier: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ ok: true, data: items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/expenses" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireRole("admin");
    if (!ctx?.companyId) {
      return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });
    }
    
    const body = await req.json();

    const expense = await prisma.expense.create({
      data: {
        companyId: ctx.companyId,
        status: "UPLOADED",
        category: body.category || null,
        jobId: body.jobId || null,
        supplierId: body.supplierId || null,
        notes: body.notes || null,
        amount: body.amount || null,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : null,
        attachmentKey: body.attachmentKey || null,
      },
      include: { supplier: true }
    });

    return NextResponse.json({ ok: true, data: expense });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/expenses" },
      { status: 500 }
    );
  }
}
