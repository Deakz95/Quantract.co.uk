import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import {
  quoteTotals,
} from "@/lib/server/db";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";
import { getPrisma } from "@/lib/server/prisma";

export async function GET(_: Request, ctx: { params: Promise<{ quoteId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { quoteId } = await getRouteParams(ctx);
  const q = await repo.getQuoteById(quoteId);
  if (!q) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const agreement = await repo.getAgreementForQuote(q.id);
  const quoteAudit = await repo.listAuditForEntity("quote", q.id);
  const agreementAudit = agreement ? await repo.listAuditForEntity("agreement", agreement.id) : [];

  return NextResponse.json({
    ok: true,
    quote: {
      ...q,
      totals: quoteTotals(q),
      shareUrl: `/client/quotes/${q.token}`,
      agreement: agreement
        ? { id: agreement.id, status: agreement.status, shareUrl: `/client/agreements/${agreement.token}` }
        : null,
      audit: {
        quote: quoteAudit,
        agreement: agreementAudit,
      },
    },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ quoteId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { quoteId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => null)) as any;

  let next = null as any;

  if (typeof body?.clientId === "string" && body.clientId.trim().length) {
    next = await repo.updateQuoteClient(quoteId, body.clientId.trim());
    if (!next) return NextResponse.json({ ok: false, error: "Client not found" }, { status: 404 });
  } else if (body?.status === "sent") {
    next = await repo.updateQuoteStatusSent(quoteId);
    if (!next) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  } else if (Array.isArray(body?.items)) {
    // Replace line items (stored as JSON on quote)
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    const q = await repo.getQuoteById(quoteId);
    if (!q) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    if (q.status !== "draft" && q.status !== "sent") {
      return NextResponse.json({ ok: false, error: "Cannot edit items on accepted/rejected quotes" }, { status: 400 });
    }
    const newItems = (body.items as Array<{ description: string; qty: number; unitPrice: number }>).map((it: { description: string; qty: number; unitPrice: number }) => ({
      id: crypto.randomUUID(),
      description: String(it.description || ""),
      qty: Number(it.qty) || 1,
      unitPrice: Number(it.unitPrice) || 0,
    }));
    await prisma.quote.update({
      where: { id: quoteId },
      data: { items: newItems, updatedAt: new Date() },
    });
    next = await repo.getQuoteById(quoteId);
  } else {
    return NextResponse.json(
      { ok: false, error: "Supported PATCH: {status:'sent'}, {clientId:'...'}, or {items:[...]}" },
      { status: 400 }
    );
  }

  const agreement = await repo.getAgreementForQuote(next.id);
  const quoteAudit = await repo.listAuditForEntity("quote", next.id);
  const agreementAudit = agreement ? await repo.listAuditForEntity("agreement", agreement.id) : [];

  return NextResponse.json({
    ok: true,
    quote: {
      ...next,
      totals: quoteTotals(next),
      shareUrl: `/client/quotes/${next.token}`,
      agreement: agreement
        ? { id: agreement.id, status: agreement.status, shareUrl: `/client/agreements/${agreement.token}` }
        : null,
      audit: {
        quote: quoteAudit,
        agreement: agreementAudit,
      },
    },
  });
}
