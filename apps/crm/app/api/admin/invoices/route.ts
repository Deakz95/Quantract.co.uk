import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { clampMoney } from "@/lib/invoiceMath";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomBytes, randomUUID } from "crypto";

export const runtime = "nodejs";

/** Roles that can view invoices (matches invoices.view capability) */
const INVOICE_VIEW_ROLES = ["admin", "office", "finance"];
/** Roles that can create/manage invoices (matches invoices.manage capability) */
const INVOICE_MANAGE_ROLES = ["admin", "finance"];

export const GET = withRequestLogging(async function GET() {
  try {
    // Use requireCompanyContext for company-scoped data access
    const ctx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(ctx);

    // Only roles with invoices.view capability can list invoices
    if (!INVOICE_VIEW_ROLES.includes(effectiveRole)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    // companyId is guaranteed non-null by requireCompanyContext
    const invoices = await client.invoice.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, email: true } },
        invoicePayments: true,
      },
    });

    return NextResponse.json({ ok: true, invoices: invoices || [] });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/invoices", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/invoices", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    // Use requireCompanyContext for company-scoped data access
    const ctx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(ctx);

    // Only roles with invoices.manage capability can create invoices
    if (!INVOICE_MANAGE_ROLES.includes(effectiveRole)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as any;

    // Create from quote (idempotent)
    const quoteId = typeof body.quoteId === "string" ? body.quoteId : undefined;
    if (quoteId) {
      // Check if quote exists and belongs to this company
      const quote = await client.quote.findFirst({
        where: { id: quoteId, companyId: ctx.companyId },
      });

      if (!quote) {
        return NextResponse.json({ ok: false, error: "quote_not_found" }, { status: 404 });
      }

      // Check if invoice already exists for this quote
      const existingInvoice = await client.invoice.findFirst({
        where: { quoteId, companyId: ctx.companyId },
      });

      if (existingInvoice) {
        return NextResponse.json({ ok: true, invoice: existingInvoice });
      }

      // Compute totals from items JSON
      const items = (quote.items as any[]) || [];
      const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.total) || Number(item.unitPrice || 0) * Number(item.qty || item.quantity || 1)), 0);
      const vat = clampMoney(subtotal * (quote.vatRate || 0));
      const total = clampMoney(subtotal + vat);

      // Generate invoice number
      const company = await client.company.findUnique({
        where: { id: ctx.companyId },
        select: { invoiceNumberPrefix: true, nextInvoiceNumber: true },
      });

      const prefix = company?.invoiceNumberPrefix || "INV-";
      const num = company?.nextInvoiceNumber || 1;
      const invoiceNumber = `${prefix}${String(num).padStart(5, "0")}`;

      // Increment next invoice number
      await client.company.update({
        where: { id: ctx.companyId },
        data: { nextInvoiceNumber: num + 1 },
      });

      const token = randomBytes(16).toString("hex");

      const invoice = await client.invoice.create({
        data: {
          id: randomUUID(),
          companyId: ctx.companyId,
          quoteId,
          clientId: quote.clientId,
          token,
          invoiceNumber,
          clientName: quote.clientName,
          clientEmail: quote.clientEmail,
          subtotal,
          vat,
          total,
          status: "draft",
          dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ ok: true, invoice });
    }

    // Manual invoice
    const clientName = String(body.clientName ?? "").trim();
    const clientEmail = String(body.clientEmail ?? "").trim().toLowerCase();
    const subtotal = clampMoney(Number(body.subtotal ?? 0));
    const vat = clampMoney(Number(body.vat ?? 0));
    const total = clampMoney(Number(body.total ?? subtotal + vat));

    if (!clientName || !clientEmail) {
      return NextResponse.json({ ok: false, error: "missing_client" }, { status: 400 });
    }

    // Generate invoice number
    const company = await client.company.findUnique({
      where: { id: ctx.companyId },
      select: { invoiceNumberPrefix: true, nextInvoiceNumber: true },
    });

    const prefix = company?.invoiceNumberPrefix || "INV-";
    const num = company?.nextInvoiceNumber || 1;
    const invoiceNumber = `${prefix}${String(num).padStart(5, "0")}`;

    await client.company.update({
      where: { id: ctx.companyId },
      data: { nextInvoiceNumber: num + 1 },
    });

    const token = randomBytes(16).toString("hex");

    const invoice = await client.invoice.create({
      data: {
        id: randomUUID(),
        companyId: ctx.companyId,
        token,
        invoiceNumber,
        clientName,
        clientEmail,
        subtotal,
        vat,
        total,
        status: "draft",
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, invoice });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/invoices", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/invoices", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
