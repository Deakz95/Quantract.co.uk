import { NextResponse } from "next/server";
import { requireRole, requireCompanyId, getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * GET /api/admin/legal-entities
 * List all legal entities for the current company.
 */
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

    const entities = await client.legalEntity.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: [{ isDefault: "desc" }, { displayName: "asc" }],
    });

    return NextResponse.json({ ok: true, entities: entities || [] });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/legal-entities", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/legal-entities", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/**
 * POST /api/admin/legal-entities
 * Create a new legal entity.
 */
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

    const companyId = authCtx.companyId;
    const body = await req.json().catch(() => ({}));

    const displayName = String(body.displayName ?? "").trim();
    const legalName = String(body.legalName ?? displayName).trim();

    if (!displayName) {
      return NextResponse.json({ ok: false, error: "missing_display_name" }, { status: 400 });
    }

    // Check for duplicate displayName
    const existing = await client.legalEntity.findFirst({
      where: { companyId, displayName },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "duplicate_name" }, { status: 409 });
    }

    const isDefault = Boolean(body.isDefault);

    // If setting as default, unset other defaults
    if (isDefault) {
      await client.legalEntity.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false, updatedAt: new Date() },
      });
    }

    const entity = await client.legalEntity.create({
      data: {
        id: randomUUID(),
        companyId,
        displayName,
        legalName,
        companyNumber: body.companyNumber ? String(body.companyNumber).trim() : null,
        vatNumber: body.vatNumber ? String(body.vatNumber).trim() : null,
        registeredAddress1: body.registeredAddress1 ? String(body.registeredAddress1).trim() : null,
        registeredAddress2: body.registeredAddress2 ? String(body.registeredAddress2).trim() : null,
        registeredCity: body.registeredCity ? String(body.registeredCity).trim() : null,
        registeredCounty: body.registeredCounty ? String(body.registeredCounty).trim() : null,
        registeredPostcode: body.registeredPostcode ? String(body.registeredPostcode).trim() : null,
        registeredCountry: body.registeredCountry ? String(body.registeredCountry).trim() : "United Kingdom",
        pdfFooterLine1: body.pdfFooterLine1 ? String(body.pdfFooterLine1).trim() : null,
        pdfFooterLine2: body.pdfFooterLine2 ? String(body.pdfFooterLine2).trim() : null,
        invoiceNumberPrefix: body.invoiceNumberPrefix ? String(body.invoiceNumberPrefix).trim() : "INV-",
        nextInvoiceNumber: 1,
        certificateNumberPrefix: body.certificateNumberPrefix ? String(body.certificateNumberPrefix).trim() : "CERT-",
        nextCertificateNumber: 1,
        isDefault,
        status: "active",
        updatedAt: new Date(),
      },
    });

    // If this is the first entity or marked default, update company
    if (isDefault) {
      await client.company.update({
        where: { id: companyId },
        data: { defaultLegalEntityId: entity.id, updatedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, entity });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/legal-entities", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/legal-entities", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
