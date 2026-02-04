import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

export const GET = withRequestLogging(
  async function GET() {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "admin" && role !== "office") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const orders = await prisma.qrOrder.findMany({
        where: { companyId: authCtx.companyId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return NextResponse.json({ ok: true, orders });
    } catch (e: any) {
      if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      console.error("GET /api/admin/qr-tags/orders error:", e);
      return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
    }
  },
);
