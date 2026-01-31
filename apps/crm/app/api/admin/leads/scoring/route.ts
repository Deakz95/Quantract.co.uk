import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { DEFAULT_CONFIG } from "@/lib/server/leadScoring";
import { isFeatureEnabled } from "@/lib/server/featureFlags";

export const runtime = "nodejs";

/**
 * GET /api/admin/leads/scoring — get scoring config
 * POST /api/admin/leads/scoring — upsert scoring config
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Feature flag check
    const prisma = getPrisma();
    const company = prisma ? await prisma.company.findUnique({ where: { id: authCtx.companyId }, select: { plan: true } }) : null;
    if (!isFeatureEnabled(company?.plan, "lead_scoring")) {
      return NextResponse.json({ ok: false, error: "feature_not_available", upgrade: true }, { status: 403 });
    }

    const cfg = await repo.getLeadScoringConfig();
    return NextResponse.json({
      ok: true,
      config: cfg?.config ?? DEFAULT_CONFIG,
      isDefault: !cfg,
    });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.config) {
      return NextResponse.json({ ok: false, error: "missing config" }, { status: 400 });
    }

    // Validate config shape
    const cfg = body.config;
    if (!Array.isArray(cfg.keywords) || !cfg.priorityThresholds) {
      return NextResponse.json({ ok: false, error: "invalid config shape" }, { status: 400 });
    }

    const result = await repo.upsertLeadScoringConfig(cfg);
    if (!result) {
      return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, config: result.config });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }
});
