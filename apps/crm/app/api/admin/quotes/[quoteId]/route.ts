import { NextResponse } from "next/server";
import { requireRoles, requireCompanyContext } from "@/lib/serverAuth";
import {
  quoteTotals,
} from "@/lib/server/db";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";
import { getPrisma } from "@/lib/server/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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

export async function DELETE(_req: Request, ctx: { params: Promise<{ quoteId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const { quoteId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { id: true, companyId: true } });
    if (!quote || quote.companyId !== authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.auditEvent.deleteMany({ where: { entityType: "quote", entityId: quoteId } });
      await tx.quoteRevision.deleteMany({ where: { quoteId } });
      const agreements = await tx.agreement.findMany({ where: { quoteId }, select: { id: true } });
      for (const a of agreements) {
        await tx.auditEvent.deleteMany({ where: { entityType: "agreement", entityId: a.id } });
      }
      await tx.agreement.deleteMany({ where: { quoteId } });
      await tx.quote.delete({ where: { id: quoteId } });
    });

    await repo.recordAuditEvent({
      entityType: "quote" as any,
      entityId: quoteId,
      action: "quote.deleted" as any,
      actorRole: "admin",
      actor: authCtx.userId,
      meta: { companyId: authCtx.companyId },
    }).catch(() => {});

    return NextResponse.json({ ok: true, deleted: true });
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json({ ok: false, error: "cannot_delete", message: "Cannot delete this quote because it is linked to other records. Remove linked jobs or invoices first." }, { status: 409 });
    }
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("DELETE /api/admin/quotes/[quoteId] error:", e);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
}
