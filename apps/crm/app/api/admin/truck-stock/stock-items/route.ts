import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

/** GET: list all stock items for the company */
export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const items = await prisma.stockItem.findMany({
      where: { companyId: authCtx.companyId, isActive: true },
      select: { id: true, name: true, sku: true, unit: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ok: true, data: items });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/** POST: create a new stock item */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => null);
    if (!body?.name?.trim()) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }

    const item = await prisma.stockItem.create({
      data: {
        id: randomBytes(12).toString("hex"),
        companyId: authCtx.companyId,
        name: body.name.trim(),
        unit: body.unit?.trim() || "pcs",
        sku: body.sku?.trim() || null,
        updatedAt: new Date(),
      },
      select: { id: true, name: true, sku: true, unit: true },
    });

    return NextResponse.json({ ok: true, data: item });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[POST /api/admin/truck-stock/stock-items]", e);
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
