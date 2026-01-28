export const dynamic = "force-dynamic";
export const revalidate = 0;


import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

export async function GET(req: Request) {
  try {
    const ctx = await requireRole("admin");
    const prisma = p();

    // Handle missing company - return empty list instead of error
    if (!ctx.companyId) {
      return NextResponse.json({
        ok: true,
        data: [],
        message: "No company associated. Please complete account setup."
      });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;

    const quotes = await prisma.quote.findMany({
      where: { companyId: ctx.companyId, ...(status ? { status } : {}) },
      include: { client: true, site: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      ok: true,
      data: quotes.map((q: any) => {
        const items = (q.items as any[]) || [];
        const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.total) || Number(item.unitPrice || 0) * Number(item.quantity || 1)), 0);
        const total = subtotal + subtotal * (q.vatRate || 0);
        return {
          quoteId: q.id,
          quoteNumber: q.token?.slice(0, 8)?.toUpperCase() || q.id.slice(0, 8),
          clientName: q.client?.name || q.clientName,
          siteName: q.site?.name,
          total,
          status: q.status,
          lastSentAt: q.sentAt,
          acceptedAt: q.acceptedAt,
        };
      })
    });
  } catch (error: any) {
    console.error("Quotes summary error:", error);
    const statusCode = error?.status || 500;
    const message = error?.message || "Internal server error";
    return NextResponse.json({ ok: false, error: message }, { status: statusCode });
  }
}
