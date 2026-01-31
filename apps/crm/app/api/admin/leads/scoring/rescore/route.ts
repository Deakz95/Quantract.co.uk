import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { scoreEnquiry, DEFAULT_CONFIG, type LeadScoringConfigData } from "@/lib/server/leadScoring";

export const runtime = "nodejs";

/**
 * POST /api/admin/leads/scoring/rescore
 * Re-score one enquiry (by id) or all recent enquiries.
 * Body: { enquiryId?: string }
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    // Load scoring config
    const cfgRow = await repo.getLeadScoringConfig();
    const config: LeadScoringConfigData = (cfgRow?.config as LeadScoringConfigData) ?? DEFAULT_CONFIG;

    // Determine which enquiries to rescore
    const where: any = { companyId: authCtx.companyId };
    if (body.enquiryId) {
      where.id = body.enquiryId;
    }

    const enquiries = await client.enquiry.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        message: true,
        notes: true,
        postcode: true,
        source: true,
        valueEstimate: true,
      },
      take: 500, // limit batch size
      orderBy: { createdAt: "desc" },
    });

    let updated = 0;
    for (const enq of enquiries) {
      const result = scoreEnquiry(enq, config);
      await repo.updateEnquiryScore(
        enq.id,
        result.score,
        result.priority,
        result.reason as unknown as Record<string, unknown>,
        result.reason.keywords,
      );
      updated++;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    console.error("[POST /api/admin/leads/scoring/rescore]", e);
    return NextResponse.json({ ok: false, error: "rescore_failed" }, { status: 500 });
  }
});
