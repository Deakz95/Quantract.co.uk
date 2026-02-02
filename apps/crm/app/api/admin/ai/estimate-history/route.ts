import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
    }

    const url = new URL(req.url);
    const category = url.searchParams.get("category") || undefined;
    const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    const where: any = { companyId: authCtx.companyId };
    if (category) where.tradeCategory = category;

    const [estimates, total] = await Promise.all([
      prisma.aiEstimate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          description: true,
          imageSummary: true,
          confidence: true,
          tradeCategory: true,
          totalCost: true,
          convertedToQuoteId: true,
          createdAt: true,
        },
      }),
      prisma.aiEstimate.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      estimates: estimates.map((e: any) => ({
        ...e,
        createdAtISO: e.createdAt.toISOString(),
      })),
      total,
    });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[GET /api/admin/ai/estimate-history]", e);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }
});
