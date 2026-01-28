import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * GET /api/admin/lead-capture/forms
 * List all form configurations.
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

    const forms = await client.inboundFormConfig.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: { enquiries: true },
        },
      },
    });

    return NextResponse.json({ ok: true, forms: forms || [] });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/lead-capture/forms", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/lead-capture/forms", action: "list" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/**
 * POST /api/admin/lead-capture/forms
 * Create a new form configuration.
 */
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

    const companyId = authCtx.companyId;
    const body = await req.json().catch(() => ({}));

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: "missing_name" }, { status: 400 });
    }

    const slug = body.slug ? slugify(String(body.slug)) : slugify(name);

    // Check for duplicate slug
    const existing = await client.inboundFormConfig.findFirst({
      where: { companyId, slug },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "duplicate_slug" }, { status: 400 });
    }

    // Validate defaultStageId if provided
    if (body.defaultStageId) {
      const stage = await client.pipelineStage.findFirst({
        where: { id: body.defaultStageId, companyId },
      });
      if (!stage) {
        return NextResponse.json({ ok: false, error: "invalid_default_stage" }, { status: 400 });
      }
    }

    // Validate defaultOwnerId if provided
    if (body.defaultOwnerId) {
      const user = await client.user.findFirst({
        where: { id: body.defaultOwnerId, companyId },
      });
      if (!user) {
        return NextResponse.json({ ok: false, error: "invalid_default_owner" }, { status: 400 });
      }
    }

    const form = await client.inboundFormConfig.create({
      data: {
        id: randomUUID(),
        companyId,
        name,
        slug,
        defaultStageId: body.defaultStageId || null,
        defaultOwnerId: body.defaultOwnerId || null,
        requiredFields: body.requiredFields || ["name", "email"],
        optionalFields: body.optionalFields || ["phone", "message"],
        thankYouMessage: body.thankYouMessage || null,
        redirectUrl: body.redirectUrl || null,
        notifyEmails: body.notifyEmails || null,
        enableCaptcha: body.enableCaptcha !== false,
        enableHoneypot: body.enableHoneypot !== false,
        rateLimitPerMinute: body.rateLimitPerMinute || 5,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, form }, { status: 201 });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/lead-capture/forms", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/lead-capture/forms", action: "create" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
