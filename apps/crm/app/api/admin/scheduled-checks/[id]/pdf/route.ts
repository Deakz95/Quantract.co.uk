export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";
import { getDocumentBytes } from "@/lib/server/documents";

/**
 * GET /api/admin/scheduled-checks/[id]/pdf
 * Download the PDF for a completed check.
 * Company-scoped: only returns documents belonging to the authenticated company.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { id } = await getRouteParams(ctx);

    const check = await prisma.scheduledCheck.findFirst({
      where: { id, companyId: authCtx.companyId },
      select: { documentId: true, title: true, companyId: true },
    });

    if (!check) {
      return NextResponse.json({ ok: false, error: "Check not found" }, { status: 404 });
    }

    if (!check.documentId) {
      return NextResponse.json({ ok: false, error: "No PDF available for this check" }, { status: 404 });
    }

    // Retrieve document bytes — enforces company scoping
    const result = await getDocumentBytes(check.documentId, authCtx.companyId);
    if (!result) {
      return NextResponse.json({ ok: false, error: "PDF document not found" }, { status: 404 });
    }

    const filename = `check-${check.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    return new Response(new Uint8Array(result.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[GET /api/admin/scheduled-checks/[id]/pdf]", error);
    return NextResponse.json({ ok: false, error: "Failed to load PDF" }, { status: 500 });
  }
}
