import { NextRequest, NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { softDeleteDocument } from "@/lib/server/documents";

export const runtime = "nodejs";

/**
 * Check if a document is referenced by any active entities.
 * Returns an array of reference descriptions or empty array if safe to delete.
 */
async function getDocumentReferences(
  prisma: any,
  documentId: string,
  companyId: string,
): Promise<string[]> {
  const refs: string[] = [];

  const [expenseCount, qrCount, scheduledCheckCount] = await Promise.all([
    prisma.expense.count({
      where: { documentId, companyId },
    }),
    prisma.qrAssignment.count({
      where: { documentId, companyId },
    }),
    prisma.scheduledCheck.count({
      where: { documentId, companyId },
    }),
  ]);

  if (expenseCount > 0) refs.push(`${expenseCount} expense(s)`);
  if (qrCount > 0) refs.push(`${qrCount} QR assignment(s)`);
  if (scheduledCheckCount > 0) refs.push(`${scheduledCheckCount} scheduled check(s)`);

  return refs;
}

/**
 * DELETE /api/admin/storage/documents/[documentId]
 *
 * Soft-deletes a single document (sets deletedAt, decrements storage usage).
 * Checks for active references and blocks deletion unless force=true query param.
 * Logs an audit entry via OpsAuditLog.
 */
export const DELETE = withRequestLogging(async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const cid = authCtx.companyId;
    const { documentId } = await params;
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    // Verify document exists and belongs to this company
    const doc = await prisma.document.findFirst({
      where: { id: documentId, companyId: cid, deletedAt: null },
      select: { id: true, sizeBytes: true, type: true, originalFilename: true },
    });

    if (!doc) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Check references
    const refs = await getDocumentReferences(prisma, documentId, cid);
    if (refs.length > 0 && !force) {
      return NextResponse.json({
        ok: false,
        error: "has_references",
        references: refs,
        message: `Document is referenced by: ${refs.join(", ")}. Pass ?force=true to soft-delete anyway.`,
      }, { status: 409 });
    }

    // Soft-delete
    const deleted = await softDeleteDocument(documentId, cid);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
    }

    // Audit log
    await prisma.opsAuditLog.create({
      data: {
        action: "storage.document.soft_delete",
        actorId: authCtx.userId,
        payload: {
          documentId,
          companyId: cid,
          type: doc.type,
          originalFilename: doc.originalFilename,
          sizeBytes: doc.sizeBytes,
          hadReferences: refs.length > 0,
          references: refs,
          force,
        },
        result: { ok: true },
      },
    });

    return NextResponse.json({
      ok: true,
      documentId,
      bytesFreed: doc.sizeBytes,
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    logError(error, { route: "DELETE /api/admin/storage/documents/[documentId]" });
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
});
