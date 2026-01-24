import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/admin/settings
 * Admin-only. Must return 401 (not 500) when accessed by non-admin.
 */
export const GET = withRequestLogging(async function GET() {
  // --- RBAC guard (MUST NOT THROW) ---
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const client = getPrisma();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "prisma_disabled" },
      { status: 400 }
    );
  }

  const company = await client.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      brandName: true,
      brandTagline: true,
      logoKey: true,
      defaultVatRate: true,
      invoiceNumberPrefix: true,
      nextInvoiceNumber: true,
      certificateNumberPrefix: true,
      nextCertificateNumber: true,
      onboardedAt: true,
      defaultPaymentTermsDays: true,
      autoChaseEnabled: true,
    },
  });

  if (!company) {
    return NextResponse.json(
      { ok: false, error: "company_not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, company });
});

/**
 * PATCH /api/admin/settings
 * Admin-only. Must return 401 (not 500) when accessed by non-admin.
 */
export const PATCH = withRequestLogging(async function PATCH(req: Request) {
  // --- RBAC guard (MUST NOT THROW) ---
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const client = getPrisma();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "prisma_disabled" },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as any;

  const data: any = {
    brandName:
      typeof body.brandName === "string" ? body.brandName.trim() : undefined,

    brandTagline:
      typeof body.brandTagline === "string"
        ? body.brandTagline.trim()
        : body.brandTagline === null
        ? null
        : undefined,

    defaultVatRate:
      typeof body.defaultVatRate === "number"
        ? body.defaultVatRate
        : undefined,

    invoiceNumberPrefix:
      typeof body.invoiceNumberPrefix === "string"
        ? body.invoiceNumberPrefix
        : undefined,

    nextInvoiceNumber:
      typeof body.nextInvoiceNumber === "number"
        ? Math.max(1, Math.floor(body.nextInvoiceNumber))
        : undefined,

    certificateNumberPrefix:
      typeof body.certificateNumberPrefix === "string"
        ? body.certificateNumberPrefix
        : undefined,

    nextCertificateNumber:
      typeof body.nextCertificateNumber === "number"
        ? Math.max(1, Math.floor(body.nextCertificateNumber))
        : undefined,

    defaultPaymentTermsDays:
      typeof body.defaultPaymentTermsDays === "number"
        ? Math.max(0, Math.floor(body.defaultPaymentTermsDays))
        : undefined,

    autoChaseEnabled:
      typeof body.autoChaseEnabled === "boolean"
        ? body.autoChaseEnabled
        : undefined,
  };

  // Optional onboarding flag
  if (body.markOnboarded === true) {
    data.onboardedAt = new Date();
  }

  const updated = await client.company
    .update({
      where: { id: companyId },
      data,
    })
    .catch(() => null);

  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "update_failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
});
