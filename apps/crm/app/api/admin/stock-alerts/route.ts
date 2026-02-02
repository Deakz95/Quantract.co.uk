import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/** GET: list stock alerts with filters + pagination */
export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "truck_stock_low";
    const status = url.searchParams.get("status") || undefined;
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);

    const where: any = { companyId: authCtx.companyId, type };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.stockAlert.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.stockAlert.count({ where }),
    ]);

    return NextResponse.json({ ok: true, data, total, page, limit });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[GET /api/admin/stock-alerts]", e);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
