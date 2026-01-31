import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";
import * as repo from "@/lib/server/repo";
import { renderRamsPdf } from "@/lib/tools/rams-generator/pdf";
import { renderSafetyAssessmentPdf } from "@/lib/tools/safety-assessment/pdf";
import { rateLimitByIp, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

export const runtime = "nodejs";

/**
 * GET /api/admin/rams/[id]/pdf
 * Generate and download PDF for a RAMS or Safety Assessment document.
 * Renders on-demand — no server-side storage.
 *
 * Infra rate limiting (Vercel/Cloudflare) is primary; this is an app-layer backstop.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    // App-layer rate limit backstop
    const rl = rateLimitByIp(req as NextRequest, { limit: 10, windowMs: 60_000 }, "rams-pdf:ip");
    if (!rl.ok) {
      return createRateLimitResponse({
        error: "Too many PDF requests. Please try again shortly.",
        resetAt: rl.resetAt,
      });
    }

    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await getRouteParams(ctx);
    const prisma = getPrisma();

    const doc = await prisma.ramsDocument.findFirst({
      where: { id, companyId: authCtx.companyId },
    });

    if (!doc) {
      return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
    }

    if (!doc.contentJson) {
      return NextResponse.json({ ok: false, error: "Document has no content" }, { status: 400 });
    }

    const brand = await repo.getBrandContextForCurrentCompany();
    const contentJson = doc.contentJson as any;

    let pdfBytes: Uint8Array;
    let filename: string;

    if (doc.type === "rams") {
      pdfBytes = await renderRamsPdf(contentJson, {
        title: doc.title,
        version: doc.version,
        status: doc.status,
        preparedBy: doc.preparedBy,
        reviewedBy: doc.reviewedBy,
        issuedAt: doc.issuedAt?.toISOString() ?? null,
      }, brand);
      filename = `RAMS-${doc.title.replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 40)}-v${doc.version}.pdf`;
    } else {
      pdfBytes = await renderSafetyAssessmentPdf(contentJson, {
        title: doc.title,
        version: doc.version,
        status: doc.status,
        issuedAt: doc.issuedAt?.toISOString() ?? null,
      }, brand);
      filename = `Safety-Assessment-${doc.title.replace(/[^a-zA-Z0-9-_ ]/g, "").slice(0, 40)}-v${doc.version}.pdf`;
    }

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "Forbidden" }, { status: err.status });
    }
    console.error("[GET /api/admin/rams/[id]/pdf]", error);
    return NextResponse.json({ ok: false, error: "Failed to generate PDF" }, { status: 500 });
  }
}
