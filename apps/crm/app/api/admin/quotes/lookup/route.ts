import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { quoteTotals } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const url = new URL(req.url);
    const query = (url.searchParams.get("query") || "").trim().toLowerCase();

    const quotes = await prisma.quote.findMany({
      where: {
        companyId: authCtx.companyId,
        deletedAt: null,
        status: { in: ["draft", "sent", "accepted"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        quoteNumber: true,
        clientName: true,
        clientEmail: true,
        status: true,
        items: true,
        vatRate: true,
        createdAt: true,
      },
    });

    // Filter client-side for flexible matching
    const filtered = query
      ? quotes.filter((q: any) =>
          (q.quoteNumber || "").toLowerCase().includes(query) ||
          q.clientName.toLowerCase().includes(query) ||
          q.clientEmail.toLowerCase().includes(query)
        )
      : quotes;

    return NextResponse.json({
      ok: true,
      quotes: filtered.slice(0, 20).map((q: any) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        clientName: q.clientName,
        clientEmail: q.clientEmail,
        status: q.status,
        total: quoteTotals(q as any).total,
      })),
    });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "lookup_failed" }, { status: 500 });
  }
}
