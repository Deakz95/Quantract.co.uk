import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { softDeleteDocument } from "@/lib/server/documents";

export const runtime = "nodejs";

/**
 * DELETE /api/admin/engineers/[engineerId]/qualifications/[qualId]
 * Soft-delete a qualification and its associated document.
 */
export const DELETE = withRequestLogging(
  async function DELETE(
    _req: Request,
    ctx: { params: Promise<{ engineerId: string; qualId: string }> },
  ) {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "admin" && role !== "office") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const { engineerId, qualId } = await getRouteParams(ctx);
      const cid = authCtx.companyId;
      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const qual = await prisma.engineerQualification.findFirst({
        where: { id: qualId, engineerId, companyId: cid, deletedAt: null },
        select: { id: true, documentId: true },
      });
      if (!qual) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }

      // Soft-delete the qualification row
      await prisma.engineerQualification.update({
        where: { id: qualId },
        data: { deletedAt: new Date() },
      });

      // Soft-delete the associated document if any
      if (qual.documentId) {
        await softDeleteDocument(qual.documentId, cid).catch(() => null);
      }

      return NextResponse.json({ ok: true, deleted: true });
    } catch (error: any) {
      if (error?.status === 401) {
        return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      }
      logError(error, { route: "/api/admin/engineers/[engineerId]/qualifications/[qualId]", action: "delete" });
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
  },
);
