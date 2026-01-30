import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import { quoteTotals } from "@/lib/server/db";
import * as repo from "@/lib/server/repo";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";

export async function POST(req: Request, ctx: { params: Promise<{ quoteId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { quoteId } = await getRouteParams(ctx);
  const q = await repo.getQuoteById(quoteId);
  if (!q) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if ((q.status as string) === "rejected") {
    return NextResponse.json({
      ok: true,
      quote: { ...q, totals: quoteTotals(q), shareUrl: `/client/quotes/${q.token}` },
    });
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: string };

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
  }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "rejected", updatedAt: new Date() },
  });

  await repo.recordAuditEvent({
    entityType: "quote",
    entityId: quoteId,
    action: "quote.rejected" as any,
    actorRole: "admin",
    actor: session.email || undefined,
    meta: body.reason ? { reason: body.reason } : undefined,
  });

  const quoteAudit = await repo.listAuditForEntity("quote", quoteId);

  return NextResponse.json({
    ok: true,
    quote: {
      ...q,
      status: "rejected",
      totals: quoteTotals(q),
      shareUrl: `/client/quotes/${q.token}`,
      audit: { quote: quoteAudit, agreement: [] },
    },
  });
}
