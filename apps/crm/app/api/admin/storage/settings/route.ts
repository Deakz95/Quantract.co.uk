import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { requireEntitlement, EntitlementError } from "@/lib/server/requireEntitlement";

export const runtime = "nodejs";

const ALLOWED_PROVIDERS = ["internal", "external_url"] as const;

/**
 * GET /api/admin/storage/settings
 * Returns the company's storage provider settings.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const settings = await prisma.companyStorageSettings.findUnique({
    where: { companyId },
  });

  return NextResponse.json({
    ok: true,
    settings: settings ?? {
      provider: "internal",
      externalBaseUrl: null,
      externalNamingPattern: null,
      notes: null,
    },
  });
});

/**
 * POST /api/admin/storage/settings
 * Create or update storage provider settings.
 * Requires feature_byos_storage entitlement for non-internal providers.
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const provider = typeof body.provider === "string" ? body.provider : undefined;
  if (provider && !ALLOWED_PROVIDERS.includes(provider as typeof ALLOWED_PROVIDERS[number])) {
    return NextResponse.json(
      { ok: false, error: "invalid_provider", allowed: ALLOWED_PROVIDERS },
      { status: 400 },
    );
  }

  // Require entitlement for external providers
  if (provider && provider !== "internal") {
    try {
      await requireEntitlement("feature_byos_storage");
    } catch (err) {
      if (err instanceof EntitlementError) {
        return NextResponse.json(
          { ok: false, error: "upgrade_required", feature: "feature_byos_storage", requiredPlan: err.requiredPlan },
          { status: 403 },
        );
      }
      throw err;
    }
  }

  // Validate externalBaseUrl — must be https
  let externalBaseUrl: string | null | undefined;
  if (typeof body.externalBaseUrl === "string") {
    const trimmed = body.externalBaseUrl.trim().replace(/\/+$/, "");
    if (trimmed && !trimmed.startsWith("https://")) {
      return NextResponse.json(
        { ok: false, error: "external_base_url_must_be_https" },
        { status: 400 },
      );
    }
    externalBaseUrl = trimmed || null;
  } else if (body.externalBaseUrl === null) {
    externalBaseUrl = null;
  }

  const externalNamingPattern =
    typeof body.externalNamingPattern === "string"
      ? body.externalNamingPattern.trim() || null
      : body.externalNamingPattern === null
        ? null
        : undefined;

  const notes =
    typeof body.notes === "string"
      ? body.notes.trim() || null
      : body.notes === null
        ? null
        : undefined;

  const data: Record<string, unknown> = {};
  if (provider !== undefined) data.provider = provider;
  if (externalBaseUrl !== undefined) data.externalBaseUrl = externalBaseUrl;
  if (externalNamingPattern !== undefined) data.externalNamingPattern = externalNamingPattern;
  if (notes !== undefined) data.notes = notes;

  const settings = await prisma.companyStorageSettings.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true, settings });
});
