import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { timeStart, logPerf } from "@/lib/perf/timing";
import { createTtlCache } from "@/lib/perf/ttlCache";
import { requireEntitlement, EntitlementError } from "@/lib/server/requireEntitlement";

export const runtime = "nodejs";

const settingsCache = createTtlCache<object>();

/**
 * GET /api/admin/settings
 * Admin-only. Must return 401 (not 500) when accessed by non-admin.
 */
export const GET = withRequestLogging(async function GET() {
  const stopTotal = timeStart("settings_total");
  let msAuth = 0;
  let msDb = 0;

  // --- RBAC guard (MUST NOT THROW) ---
  const stopAuth = timeStart("settings_auth");
  try {
    await requireRole("admin");
  } catch {
    msAuth = stopAuth();
    logPerf("settings", { msTotal: stopTotal(), msAuth, ok: false, err: "unauthorized" });
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    msAuth = stopAuth();
    logPerf("settings", { msTotal: stopTotal(), msAuth, ok: false, err: "unauthorized" });
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }
  msAuth = stopAuth();

  const json = await settingsCache.getOrSet(companyId, 60_000, async () => {
    const stopDb = timeStart("settings_db");
    const client = getPrisma();
    if (!client) {
      return { _status: 400, ok: false, error: "prisma_disabled" };
    }

    const company = await client.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        subdomain: true,
        customDomain: true,
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
        markJobCompletedOnCertIssue: true,
        themePrimary: true,
        themeAccent: true,
        themeBg: true,
        themeText: true,
        pdfFooterLine1: true,
        pdfFooterLine2: true,
        pdfContactDetails: true,
        uiMode: true,
      },
    });
    msDb = stopDb();

    if (!company) {
      return { _status: 404, ok: false, error: "company_not_found" };
    }
    return { ok: true, company };
  });

  const resp = json as any;
  const status = resp._status;
  if (status) {
    const { _status, ...body } = resp;
    logPerf("settings", { msTotal: stopTotal(), msAuth, msDb, cacheHit: false, ok: false });
    return NextResponse.json(body, { status });
  }
  logPerf("settings", { msTotal: stopTotal(), msAuth, msDb, cacheHit: msDb === 0, ok: true });
  return NextResponse.json(resp);
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

    markJobCompletedOnCertIssue:
      typeof body.markJobCompletedOnCertIssue === "boolean"
        ? body.markJobCompletedOnCertIssue
        : undefined,

    themePrimary:
      typeof body.themePrimary === "string" ? body.themePrimary.trim() : undefined,

    themeAccent:
      typeof body.themeAccent === "string" ? body.themeAccent.trim() : undefined,

    themeBg:
      typeof body.themeBg === "string" ? body.themeBg.trim() : undefined,

    themeText:
      typeof body.themeText === "string" ? body.themeText.trim() : undefined,

    pdfFooterLine1:
      typeof body.pdfFooterLine1 === "string"
        ? body.pdfFooterLine1.trim() || null
        : body.pdfFooterLine1 === null ? null : undefined,

    pdfFooterLine2:
      typeof body.pdfFooterLine2 === "string"
        ? body.pdfFooterLine2.trim() || null
        : body.pdfFooterLine2 === null ? null : undefined,

    pdfContactDetails:
      typeof body.pdfContactDetails === "string"
        ? body.pdfContactDetails.trim() || null
        : body.pdfContactDetails === null ? null : undefined,

    uiMode:
      typeof body.uiMode === "string" && ["simple", "standard", "full"].includes(body.uiMode)
        ? body.uiMode
        : undefined,
  };

  // --- Subdomain (requires feature_subdomain entitlement) ---
  if (typeof body.subdomain === "string") {
    const val = body.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    try {
      await requireEntitlement("feature_subdomain");
      data.subdomain = val || null;
    } catch (err) {
      if (err instanceof EntitlementError) {
        return NextResponse.json(
          { ok: false, error: "upgrade_required", feature: "feature_subdomain", requiredPlan: err.requiredPlan },
          { status: 403 }
        );
      }
      throw err;
    }
  }

  // --- Custom domain (requires feature_custom_domain entitlement) ---
  if (typeof body.customDomain === "string") {
    const val = body.customDomain.trim().toLowerCase().replace(/\/$/, "");
    if (val && !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(\.[a-z]{2,})$/.test(val)) {
      return NextResponse.json(
        { ok: false, error: "invalid_custom_domain" },
        { status: 400 }
      );
    }
    try {
      await requireEntitlement("feature_custom_domain");
      data.customDomain = val || null;
    } catch (err) {
      if (err instanceof EntitlementError) {
        return NextResponse.json(
          { ok: false, error: "upgrade_required", feature: "feature_custom_domain", requiredPlan: err.requiredPlan },
          { status: 403 }
        );
      }
      throw err;
    }
  }

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

  // Invalidate settings cache for this company
  settingsCache.delete(companyId);

  return NextResponse.json({ ok: true });
});

/** PUT is an alias for PATCH — the subdomain UI calls PUT */
export const PUT = PATCH;
