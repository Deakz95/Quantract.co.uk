import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    const ctx = await requireRole("admin");
    if (!ctx?.companyId) {
      return NextResponse.json({ ok: true, data: [] });
    }
    
    const items = await prisma.purchaseOrder.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ ok: true, data: items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/purchase-orders" },
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
    
    // Generate PO number if not provided
    const poNumber = body.poNumber || `PO-${Date.now().toString(36).toUpperCase()}`;
    
    const row = await prisma.purchaseOrder.create({
      data: {
        companyId: ctx.companyId,
        supplierId: body.supplierId,
        jobId: body.jobId || null,
        poNumber,
        status: "DRAFT"
      }
    });
    return NextResponse.json({ ok: true, data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/purchase-orders" },
      { status: 500 }
    );
  }
}
