import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { clampMoney } from "@/lib/invoiceMath";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomBytes, randomUUID } from "crypto";
import { resolveLegalEntity, allocateInvoiceNumberForEntity } from "@/lib/server/multiEntity";

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
      where: { companyId: ctx.companyId, deletedAt: null },
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

      // Resolve legal entity for numbering
      const resolved = await resolveLegalEntity({ jobId: null });
      const legalEntityId = resolved?.legalEntityId || null;

      let invoiceNumber: string | null = null;
      if (legalEntityId) {
        invoiceNumber = await allocateInvoiceNumberForEntity(legalEntityId);
      }
      if (!invoiceNumber) {
        const company = await client.company.findUnique({
          where: { id: ctx.companyId },
          select: { invoiceNumberPrefix: true, nextInvoiceNumber: true },
        });
        const pfx = company?.invoiceNumberPrefix || "INV-";
        const n = company?.nextInvoiceNumber || 1;
        invoiceNumber = `${pfx}${String(n).padStart(6, "0")}`;
        await client.company.update({
          where: { id: ctx.companyId },
          data: { nextInvoiceNumber: n + 1 },
        });
      }

      const token = randomBytes(16).toString("hex");

      // Resolve payment terms from client or company default
      let paymentDays = 30;
      if (quote.clientId) {
        const cl = await client.client.findUnique({ where: { id: quote.clientId }, select: { paymentTermsDays: true } }).catch(() => null);
        if (cl?.paymentTermsDays) paymentDays = cl.paymentTermsDays;
      }
      if (paymentDays === 30) {
        const co = await client.company.findUnique({ where: { id: ctx.companyId }, select: { defaultPaymentTermsDays: true } }).catch(() => null);
        if (co?.defaultPaymentTermsDays) paymentDays = co.defaultPaymentTermsDays;
      }
      const dueAt = new Date(Date.now() + paymentDays * 24 * 60 * 60 * 1000);

      const invoice = await client.invoice.create({
        data: {
          id: randomUUID(),
          companyId: ctx.companyId,
          legalEntityId,
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
          dueAt,
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

    // Resolve legal entity for numbering
    const manualResolved = await resolveLegalEntity({ jobId: null });
    const manualEntityId = manualResolved?.legalEntityId || null;

    let invoiceNumber: string | null = null;
    if (manualEntityId) {
      invoiceNumber = await allocateInvoiceNumberForEntity(manualEntityId);
    }
    if (!invoiceNumber) {
      const company = await client.company.findUnique({
        where: { id: ctx.companyId },
        select: { invoiceNumberPrefix: true, nextInvoiceNumber: true },
      });
      const pfx = company?.invoiceNumberPrefix || "INV-";
      const n = company?.nextInvoiceNumber || 1;
      invoiceNumber = `${pfx}${String(n).padStart(6, "0")}`;
      await client.company.update({
        where: { id: ctx.companyId },
        data: { nextInvoiceNumber: n + 1 },
      });
    }

    const token = randomBytes(16).toString("hex");

    // Use company default payment terms
    const companySettings = await client.company.findUnique({ where: { id: ctx.companyId }, select: { defaultPaymentTermsDays: true } }).catch(() => null);
    const manualDueAt = new Date(Date.now() + (companySettings?.defaultPaymentTermsDays ?? 30) * 24 * 60 * 60 * 1000);

    const invoice = await client.invoice.create({
      data: {
        id: randomUUID(),
        companyId: ctx.companyId,
        legalEntityId: manualEntityId,
        token,
        invoiceNumber,
        clientName,
        clientEmail,
        subtotal,
        vat,
        total,
        status: "draft",
        dueAt: manualDueAt,
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
