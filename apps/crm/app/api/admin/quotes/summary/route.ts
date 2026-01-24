export const dynamic = "force-dynamic";
export const revalidate = 0;


import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

export async function GET(req: Request) {
  const ctx = await requireRole("admin");
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
}
