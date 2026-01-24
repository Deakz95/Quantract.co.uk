import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const ctx = await requireRole("admin");
    if (!ctx?.companyId) return NextResponse.json({ ok: true, data: [] });
    
    const subcontractors = await prisma.subcontractor.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json({ ok: true, data: subcontractors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/subcontractors" },
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
    
    const subcontractor = await prisma.subcontractor.create({
      data: {
        companyId: ctx.companyId,
        name: body.name,
        trade: body.trade || null,
        email: body.email || null,
        phone: body.phone || null,
        dayRate: body.dayRate || null,
        notes: body.notes || null,
      }
    });
    
    return NextResponse.json({ ok: true, data: subcontractor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/subcontractors" },
      { status: 500 }
    );
  }
}
