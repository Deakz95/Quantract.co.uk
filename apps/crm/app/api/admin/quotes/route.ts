import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { quoteTotals } from "@/lib/server/db";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomBytes, randomUUID } from "crypto";

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
      where: { companyId: authCtx.companyId },
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

    // Calculate totals from items
    const items = Array.isArray(body?.items) ? body.items : [];
    const vatRate = typeof body?.vatRate === "number" ? body.vatRate : 0.2;

    const quote = await client.quote.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        token,
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
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/quotes", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
