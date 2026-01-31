import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

/**
 * GET /api/admin/legal-entities/[entityId]
 * Get a single legal entity.
 */
export const GET = withRequestLogging(async function GET(
  _req: Request,
  ctx: { params: Promise<{ entityId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { entityId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const entity = await client.legalEntity.findFirst({
    where: { id: entityId, companyId },
  });

  if (!entity) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, entity });
});

/**
 * PATCH /api/admin/legal-entities/[entityId]
 * Update a legal entity.
 */
export const PATCH = withRequestLogging(async function PATCH(
  req: Request,
  ctx: { params: Promise<{ entityId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { entityId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const existing = await client.legalEntity.findFirst({
    where: { id: entityId, companyId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  const data: Record<string, any> = { updatedAt: new Date() };

  if (typeof body.displayName === "string") {
    const displayName = body.displayName.trim();
    if (displayName && displayName !== existing.displayName) {
      // Check for duplicate
      const dup = await client.legalEntity.findFirst({
        where: { companyId, displayName, id: { not: entityId } },
      });
      if (dup) {
        return NextResponse.json({ ok: false, error: "duplicate_name" }, { status: 400 });
      }
      data.displayName = displayName;
    }
  }

  if (typeof body.legalName === "string") data.legalName = body.legalName.trim();
  if (typeof body.companyNumber === "string") data.companyNumber = body.companyNumber.trim() || null;
  if (typeof body.vatNumber === "string") data.vatNumber = body.vatNumber.trim() || null;
  if (typeof body.registeredAddress1 === "string") data.registeredAddress1 = body.registeredAddress1.trim() || null;
  if (typeof body.registeredAddress2 === "string") data.registeredAddress2 = body.registeredAddress2.trim() || null;
  if (typeof body.registeredCity === "string") data.registeredCity = body.registeredCity.trim() || null;
  if (typeof body.registeredCounty === "string") data.registeredCounty = body.registeredCounty.trim() || null;
  if (typeof body.registeredPostcode === "string") data.registeredPostcode = body.registeredPostcode.trim() || null;
  if (typeof body.registeredCountry === "string") data.registeredCountry = body.registeredCountry.trim() || null;
  if (typeof body.pdfFooterLine1 === "string") data.pdfFooterLine1 = body.pdfFooterLine1.trim() || null;
  if (typeof body.pdfFooterLine2 === "string") data.pdfFooterLine2 = body.pdfFooterLine2.trim() || null;
  // Prefix validation: alphanumeric + dash/underscore, max 6 chars + separator
  const prefixRe = /^[A-Za-z0-9_-]{1,6}[-]?$/;

  if (typeof body.invoiceNumberPrefix === "string") {
    const v = body.invoiceNumberPrefix.trim() || "INV-";
    if (!prefixRe.test(v)) return NextResponse.json({ ok: false, error: "Invalid invoice prefix. Use up to 6 alphanumeric characters." }, { status: 400 });
    data.invoiceNumberPrefix = v;
  }
  if (typeof body.quoteNumberPrefix === "string") {
    const v = body.quoteNumberPrefix.trim() || "QUO-";
    if (!prefixRe.test(v)) return NextResponse.json({ ok: false, error: "Invalid quote prefix. Use up to 6 alphanumeric characters." }, { status: 400 });
    data.quoteNumberPrefix = v;
  }
  if (typeof body.certificateNumberPrefix === "string") {
    const v = body.certificateNumberPrefix.trim() || "CERT-";
    if (!prefixRe.test(v)) return NextResponse.json({ ok: false, error: "Invalid certificate prefix. Use up to 6 alphanumeric characters." }, { status: 400 });
    data.certificateNumberPrefix = v;
  }

  // Next-number validation: must be >= 1 and >= highest existing + 1
  if (typeof body.nextInvoiceNumber === "number") {
    const n = Math.floor(body.nextInvoiceNumber);
    if (n < 1) return NextResponse.json({ ok: false, error: "Next invoice number must be at least 1." }, { status: 400 });
    // Find highest existing invoice number for this entity to prevent collision
    const highestInv = await client.invoice.findFirst({
      where: { legalEntityId: entityId },
      orderBy: { invoiceNumber: "desc" },
      select: { invoiceNumber: true },
    });
    if (highestInv?.invoiceNumber) {
      const match = highestInv.invoiceNumber.match(/(\d+)$/);
      const highest = match ? parseInt(match[1], 10) : 0;
      if (n <= highest) {
        return NextResponse.json({ ok: false, error: `Next invoice number must be greater than ${highest} (highest existing).` }, { status: 400 });
      }
    }
    data.nextInvoiceNumber = n;
  }

  if (typeof body.nextQuoteNumber === "number") {
    const n = Math.floor(body.nextQuoteNumber);
    if (n < 1) return NextResponse.json({ ok: false, error: "Next quote number must be at least 1." }, { status: 400 });
    const highestQ = await client.quote.findFirst({
      where: { legalEntityId: entityId },
      orderBy: { quoteNumber: "desc" },
      select: { quoteNumber: true },
    });
    if (highestQ?.quoteNumber) {
      const match = highestQ.quoteNumber.match(/(\d+)$/);
      const highest = match ? parseInt(match[1], 10) : 0;
      if (n <= highest) {
        return NextResponse.json({ ok: false, error: `Next quote number must be greater than ${highest} (highest existing).` }, { status: 400 });
      }
    }
    data.nextQuoteNumber = n;
  }

  if (typeof body.nextCertificateNumber === "number") {
    const n = Math.floor(body.nextCertificateNumber);
    if (n < 1) return NextResponse.json({ ok: false, error: "Next certificate number must be at least 1." }, { status: 400 });
    const highestC = await client.certificate.findFirst({
      where: { legalEntityId: entityId },
      orderBy: { certificateNumber: "desc" },
      select: { certificateNumber: true },
    });
    if (highestC?.certificateNumber) {
      const match = highestC.certificateNumber.match(/(\d+)$/);
      const highest = match ? parseInt(match[1], 10) : 0;
      if (n <= highest) {
        return NextResponse.json({ ok: false, error: `Next certificate number must be greater than ${highest} (highest existing).` }, { status: 400 });
      }
    }
    data.nextCertificateNumber = n;
  }

  if (typeof body.status === "string" && ["active", "inactive"].includes(body.status)) {
    data.status = body.status;
  }

  // Handle isDefault
  if (typeof body.isDefault === "boolean" && body.isDefault !== existing.isDefault) {
    if (body.isDefault) {
      // Unset other defaults
      await client.legalEntity.updateMany({
        where: { companyId, isDefault: true, id: { not: entityId } },
        data: { isDefault: false, updatedAt: new Date() },
      });
      data.isDefault = true;
      // Update company default
      await client.company.update({
        where: { id: companyId },
        data: { defaultLegalEntityId: entityId, updatedAt: new Date() },
      });
    } else {
      data.isDefault = false;
    }
  }

  const entity = await client.legalEntity.update({
    where: { id: entityId },
    data,
  });

  return NextResponse.json({ ok: true, entity });
});

/**
 * DELETE /api/admin/legal-entities/[entityId]
 * Delete a legal entity (only if no invoices/certificates reference it).
 */
export const DELETE = withRequestLogging(async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ entityId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { entityId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const entity = await client.legalEntity.findFirst({
    where: { id: entityId, companyId },
  });

  if (!entity) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Check for references
  const invoiceCount = await client.invoice.count({ where: { legalEntityId: entityId } });
  const certCount = await client.certificate.count({ where: { legalEntityId: entityId } });

  if (invoiceCount > 0 || certCount > 0) {
    return NextResponse.json({
      ok: false,
      error: "entity_in_use",
      message: `Cannot delete: ${invoiceCount} invoice(s) and ${certCount} certificate(s) reference this entity.`,
    }, { status: 400 });
  }

  // Check if it's the default
  if (entity.isDefault) {
    return NextResponse.json({
      ok: false,
      error: "cannot_delete_default",
      message: "Cannot delete the default legal entity. Set another entity as default first.",
    }, { status: 400 });
  }

  await client.legalEntity.delete({ where: { id: entityId } });

  return NextResponse.json({ ok: true });
});
