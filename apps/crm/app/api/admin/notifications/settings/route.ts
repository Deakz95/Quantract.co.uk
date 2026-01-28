import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { initializeDefaultTemplates } from "@/lib/server/notifications";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

/**
 * GET /api/admin/notifications/settings
 * Get company notification settings
 */
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

    const company = await client.company.findUnique({
      where: { id: authCtx.companyId },
      select: {
        smsEnabled: true,
        smsProvider: true,
        smsSenderId: true,
        smsRequireConsent: true,
        smsQuietHoursEnabled: true,
        smsQuietFrom: true,
        smsQuietTo: true,
        smsMaxPerClientPerDay: true,
        smsMaxPerJobPerDay: true,
        smsCredits: true,
      },
    });

    if (!company) {
      return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      settings: {
        smsEnabled: company.smsEnabled,
        smsProvider: company.smsProvider,
        smsSenderId: company.smsSenderId,
        smsRequireConsent: company.smsRequireConsent,
        smsQuietHoursEnabled: company.smsQuietHoursEnabled,
        smsQuietFrom: company.smsQuietFrom,
        smsQuietTo: company.smsQuietTo,
        smsMaxPerClientPerDay: company.smsMaxPerClientPerDay,
        smsMaxPerJobPerDay: company.smsMaxPerJobPerDay,
        smsCredits: company.smsCredits,
        providerConfigured: Boolean(company.smsProvider && company.smsSenderId),
      },
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/notifications/settings", action: "get" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/notifications/settings", action: "get" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/**
 * PATCH /api/admin/notifications/settings
 * Update company notification settings
 */
export const PATCH = withRequestLogging(async function PATCH(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const companyId = authCtx.companyId;
    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));

    const data: Record<string, unknown> = {};

    // SMS enabled
    if (typeof body.smsEnabled === "boolean") {
      data.smsEnabled = body.smsEnabled;

      // Initialize templates when SMS is first enabled
      if (body.smsEnabled) {
        await initializeDefaultTemplates(companyId);
      }
    }

    // Provider settings
    if (typeof body.smsProvider === "string") {
      data.smsProvider = body.smsProvider || null;
    }
    if (typeof body.smsSenderId === "string") {
      data.smsSenderId = body.smsSenderId || null;
    }
    if (typeof body.smsApiKey === "string") {
      data.smsApiKey = body.smsApiKey || null;
    }
    if (typeof body.smsApiSecret === "string") {
      data.smsApiSecret = body.smsApiSecret || null;
    }

    // Consent & quiet hours
    if (typeof body.smsRequireConsent === "boolean") {
      data.smsRequireConsent = body.smsRequireConsent;
    }
    if (typeof body.smsQuietHoursEnabled === "boolean") {
      data.smsQuietHoursEnabled = body.smsQuietHoursEnabled;
    }
    if (typeof body.smsQuietFrom === "string" || body.smsQuietFrom === null) {
      data.smsQuietFrom = body.smsQuietFrom || null;
    }
    if (typeof body.smsQuietTo === "string" || body.smsQuietTo === null) {
      data.smsQuietTo = body.smsQuietTo || null;
    }

    // Rate limits
    if (typeof body.smsMaxPerClientPerDay === "number") {
      data.smsMaxPerClientPerDay = Math.max(1, Math.floor(body.smsMaxPerClientPerDay));
    }
    if (typeof body.smsMaxPerJobPerDay === "number") {
      data.smsMaxPerJobPerDay = Math.max(1, Math.floor(body.smsMaxPerJobPerDay));
    }

    // Credits (admin-only adjustment)
    if (typeof body.smsCredits === "number") {
      data.smsCredits = Math.max(0, Math.floor(body.smsCredits));
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
    }

    data.updatedAt = new Date();

    await client.company.update({
      where: { id: companyId },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/notifications/settings", action: "update" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/notifications/settings", action: "update" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});
