import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { quoteTotals } from "@/lib/server/db";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomBytes, randomUUID } from "crypto";
import { resolveLegalEntity, allocateQuoteNumberForEntity } from "@/lib/server/multiEntity";
import { scopedKey, getIdempotentResponse, setIdempotentResponse } from "@/lib/server/idempotency";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const quotes = await client.quote.findMany({
      where: { companyId: authCtx.companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, email: true } },
        site: { select: { id: true, name: true, address1: true, city: true, postcode: true } },
      },
    });

    const mappedQuotes = quotes.map((q: any) => ({
      ...q,
      totals: quoteTotals(q),
      shareUrl: `/client/quotes/${q.token}`,
    }));

    return NextResponse.json({ ok: true, quotes: mappedQuotes });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/quotes", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/quotes", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // --- Idempotency-Key support ---
    const rawIdemKey = req.headers.get("idempotency-key");
    let idemKey: string | null = null;
    if (rawIdemKey) {
      idemKey = scopedKey(rawIdemKey, authCtx.companyId, authCtx.userId, "POST:/api/admin/quotes");
      const cached = await getIdempotentResponse(idemKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as any;

    const clientName = String(body?.clientName ?? "").trim();
    const clientEmail = String(body?.clientEmail ?? "").trim().toLowerCase();

    if (!clientName) {
      return NextResponse.json({ ok: false, error: "missing_client_name" }, { status: 400 });
    }
    if (!clientEmail || !clientEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_client_email" }, { status: 400 });
    }

    // Generate token
    const token = randomBytes(16).toString("hex");

    // Calculate totals from items — normalise each item to ensure id + numeric fields
    const rawItems = Array.isArray(body?.items) ? body.items : [];
    const items = rawItems.map((it: any) => {
      const base: any = {
        id: it.id || randomUUID(),
        description: String(it.description ?? ""),
        qty: typeof it.qty === "number" && Number.isFinite(it.qty) ? it.qty : (Number(it.qty) || 0),
        unitPrice: typeof it.unitPrice === "number" && Number.isFinite(it.unitPrice) ? it.unitPrice : (Number(it.unitPrice) || 0),
      };
      if (typeof it.stockItemId === "string" && it.stockItemId) {
        base.stockItemId = it.stockItemId;
        base.stockQty = typeof it.stockQty === "number" && Number.isFinite(it.stockQty) ? Math.max(0, Math.round(it.stockQty)) : Math.max(0, Math.round(base.qty));
      }
      return base;
    });
    const vatRate = typeof body?.vatRate === "number" ? body.vatRate : 0.2;

    // Resolve legal entity for numbering scope
    const resolved = await resolveLegalEntity({});
    const legalEntityId = resolved?.legalEntityId || null;

    // Allocate quote number from legal entity counter (atomic)
    let quoteNumber: string | null = null;
    if (legalEntityId) {
      quoteNumber = await allocateQuoteNumberForEntity(legalEntityId);
      if (!quoteNumber) {
        console.warn(`[quotes] allocateQuoteNumberForEntity returned null for entity ${legalEntityId}, falling back to company counter`);
      }
    }
    // Fallback to company counter if no entity or entity allocation failed
    if (!quoteNumber) {
      const co = await client.company.findUnique({
        where: { id: authCtx.companyId },
        select: { quoteNumberPrefix: true, nextQuoteNumber: true },
      });
      const prefix = co?.quoteNumberPrefix || "QUO-";
      const num = co?.nextQuoteNumber || 1;
      quoteNumber = `${prefix}${String(num).padStart(6, "0")}`;
      await client.company.update({
        where: { id: authCtx.companyId },
        data: { nextQuoteNumber: num + 1 },
      });
    }

    const quote = await client.quote.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        legalEntityId,
        token,
        quoteNumber,
        clientId: typeof body?.clientId === "string" ? body.clientId : null,
        clientName,
        clientEmail,
        siteId: typeof body?.siteId === "string" ? body.siteId : null,
        siteAddress: body?.siteAddress || null,
        notes: body?.notes || null,
        vatRate,
        items: items as any,
        status: "draft",
        updatedAt: new Date(),
      },
    });

    const responseBody = {
      ok: true,
      quote: {
        ...quote,
        totals: quoteTotals(quote),
        shareUrl: `/client/quotes/${quote.token}`,
      },
    };

    // Store response for idempotency dedup
    if (idemKey) {
      await setIdempotentResponse(idemKey, responseBody).catch(() => {});
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/quotes", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/quotes", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
