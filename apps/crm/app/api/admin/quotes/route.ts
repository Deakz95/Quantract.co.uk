import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { quoteTotals } from "@/lib/server/db";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomBytes, randomUUID } from "crypto";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 401 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const quotes = await client.quote.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
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
    logError(error, { route: "/api/admin/quotes", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 401 });
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

    // Generate token and quote number
    const token = randomBytes(16).toString("hex");
    const company = await client.company.findUnique({
      where: { id: authCtx.companyId },
      select: { invoiceNumberPrefix: true, nextInvoiceNumber: true },
    });

    const quoteNumber = `Q-${String(company?.nextInvoiceNumber || 1).padStart(5, "0")}`;

    // Calculate totals from items
    const items = Array.isArray(body?.items) ? body.items : [];
    const vatRate = typeof body?.vatRate === "number" ? body.vatRate : 0.2;
    const subtotal = items.reduce((sum: number, item: any) => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitPrice || 0);
      return sum + qty * price;
    }, 0);
    const vat = subtotal * vatRate;
    const total = subtotal + vat;

    const quote = await client.quote.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        token,
        quoteNumber,
        clientId: typeof body?.clientId === "string" ? body.clientId : null,
        clientName,
        clientEmail,
        siteId: typeof body?.siteId === "string" ? body.siteId : null,
        siteAddress: body?.siteAddress || null,
        notes: body?.notes || null,
        vatRate,
        subtotal,
        vat,
        total,
        status: "draft",
        updatedAt: new Date(),
        items: items.length > 0 ? {
          create: items.map((item: any, index: number) => ({
            id: randomUUID(),
            description: String(item.description || ""),
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            sortOrder: index,
          })),
        } : undefined,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      ok: true,
      quote: {
        ...quote,
        totals: quoteTotals(quote),
        shareUrl: `/client/quotes/${quote.token}`,
      },
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/quotes", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/quotes", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
