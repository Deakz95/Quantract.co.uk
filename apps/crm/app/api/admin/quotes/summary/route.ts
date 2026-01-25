export const dynamic = "force-dynamic";
export const revalidate = 0;


import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

export async function GET(req: Request) {
  try {
    const ctx = await requireRole("admin");

    if (!ctx.companyId) {
      return NextResponse.json({
        ok: false,
        error: "No company associated with your account. Please complete account setup.",
        requiresSetup: true,
      }, { status: 403 });
    }

    const prisma = p();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;

    const quotes = await prisma.quote.findMany({
      where: { companyId: ctx.companyId, ...(status ? { status } : {}) },
      include: { client: true, site: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      ok: true,
      data: quotes.map((q: any) => ({
        quoteId: q.id,
        quoteNumber: q.quoteNumber,
        clientName: q.client?.name,
        siteName: q.site?.name,
        total: q.total,
        status: q.status,
        lastSentAt: q.sentAt,
        acceptedAt: q.acceptedAt
      }))
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("Quotes summary error:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch quotes" }, { status: 500 });
  }
}
