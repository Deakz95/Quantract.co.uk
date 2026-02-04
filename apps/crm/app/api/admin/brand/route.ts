import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/admin/brand
 * Returns brand-related fields for the current company.
 * Admin/office-only.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    await requireRoles(["admin", "office"]);
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const company = await client.company.findUnique({
    where: { id: companyId },
    select: {
      brandName: true,
      brandTagline: true,
      logoKey: true,
      themePrimary: true,
      themeAccent: true,
      themeBg: true,
      themeText: true,
      pdfFooterLine1: true,
      pdfFooterLine2: true,
      pdfContactDetails: true,
    },
  });

  if (!company) {
    return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, brand: company });
});

/**
 * POST /api/admin/brand
 * Updates brand-related fields for the current company.
 * Admin/office-only.
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRoles(["admin", "office"]);
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as any;

  const data: any = {};

  if (typeof body.brandName === "string") data.brandName = body.brandName.trim();
  if (typeof body.brandTagline === "string") data.brandTagline = body.brandTagline.trim() || null;
  if (body.brandTagline === null) data.brandTagline = null;
  if (typeof body.themePrimary === "string") data.themePrimary = body.themePrimary.trim();
  if (typeof body.themeAccent === "string") data.themeAccent = body.themeAccent.trim();
  if (typeof body.themeBg === "string") data.themeBg = body.themeBg.trim();
  if (typeof body.themeText === "string") data.themeText = body.themeText.trim();
  if (typeof body.pdfFooterLine1 === "string") data.pdfFooterLine1 = body.pdfFooterLine1.trim() || null;
  if (body.pdfFooterLine1 === null) data.pdfFooterLine1 = null;
  if (typeof body.pdfFooterLine2 === "string") data.pdfFooterLine2 = body.pdfFooterLine2.trim() || null;
  if (body.pdfFooterLine2 === null) data.pdfFooterLine2 = null;
  if (typeof body.pdfContactDetails === "string") data.pdfContactDetails = body.pdfContactDetails.trim() || null;
  if (body.pdfContactDetails === null) data.pdfContactDetails = null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "no_fields" }, { status: 400 });
  }

  const updated = await client.company
    .update({ where: { id: companyId }, data })
    .catch(() => null);

  if (!updated) {
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
});
