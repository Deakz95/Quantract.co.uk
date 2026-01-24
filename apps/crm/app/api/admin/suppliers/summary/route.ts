import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const ctx = await requireRole("admin");
    if (!ctx?.companyId) return NextResponse.json({ ok: true, data: [] });
    
    const suppliers = await prisma.supplier.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: { expenses: true }
        }
      },
      orderBy: { name: "asc" }
    });
    
    const summary = suppliers.map((s: {
  id: (typeof suppliers)[number]['id'];
  name: (typeof suppliers)[number]['name'];
  email: (typeof suppliers)[number]['email'];
  _count: { expenses: number };
}) => ({
  id: s.id,
  name: s.name,
  email: s.email,
  expenseCount: s._count.expenses,
}));
    
    return NextResponse.json({ ok: true, data: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/suppliers/summary" },
      { status: 500 }
    );
  }
}
