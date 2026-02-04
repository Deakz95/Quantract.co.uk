import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { requireEntitlement, EntitlementError } from "@/lib/server/requireEntitlement";

export const runtime = "nodejs";

/**
 * GET /api/admin/lead-capture/domains
 * List all allowed domains for lead capture.
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

    const domains = await client.allowedDomain.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: [{ isActive: "desc" }, { domain: "asc" }],
    });

    return NextResponse.json({ ok: true, domains: domains || [] });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/lead-capture/domains", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/lead-capture/domains", action: "list" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/**
 * POST /api/admin/lead-capture/domains
 * Add a new allowed domain.
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Entitlement check — custom domains require feature_custom_domain
    await requireEntitlement("feature_custom_domain");

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const companyId = authCtx.companyId;
    const body = await req.json().catch(() => ({}));

    let domain = String(body.domain ?? "").trim().toLowerCase();
    if (!domain) {
      return NextResponse.json({ ok: false, error: "missing_domain" }, { status: 400 });
    }

    // Normalize domain - remove protocol and trailing slash
    domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    // Basic domain validation
    const domainRegex = /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ ok: false, error: "invalid_domain_format" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await client.allowedDomain.findFirst({
      where: { companyId, domain },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "duplicate_domain" }, { status: 400 });
    }

    const allowedDomain = await client.allowedDomain.create({
      data: {
        id: randomUUID(),
        companyId,
        domain,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, domain: allowedDomain }, { status: 201 });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/lead-capture/domains", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/lead-capture/domains", action: "create" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
