import { NextRequest, NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { softDeleteDocument } from "@/lib/server/documents";

export const runtime = "nodejs";

/**
 * POST /api/admin/storage/cleanup
 *
 * Bulk soft-delete documents by ID list.
 * Body: { documentIds: string[], force?: boolean }
 *
 * Returns per-document results: { id, ok, error?, bytesFreed? }
 * Documents with active references are skipped unless force=true.
 * Max 50 documents per request to prevent abuse.
 */
export const POST = withRequestLogging(async function POST(req: NextRequest) {
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
    const body = await req.json();
    const documentIds: string[] = body.documentIds;
    const force = body.force === true;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ ok: false, error: "invalid_body", message: "documentIds must be a non-empty array" }, { status: 400 });
    }
    if (documentIds.length > 50) {
      return NextResponse.json({ ok: false, error: "too_many", message: "Max 50 documents per request" }, { status: 400 });
    }

    // Verify all documents belong to this company and are active
    const docs = await prisma.document.findMany({
      where: { id: { in: documentIds }, companyId: cid, deletedAt: null },
      select: { id: true, sizeBytes: true, type: true, originalFilename: true },
    });
    const docMap = new Map<string, { id: string; sizeBytes: number; type: string; originalFilename: string | null }>(
      docs.map((d: any) => [d.id, d]),
    );

    const results: Array<{ id: string; ok: boolean; error?: string; bytesFreed?: number; references?: string[] }> = [];
    let totalBytesFreed = 0;

    for (const docId of documentIds) {
      const doc = docMap.get(docId);
      if (!doc) {
        results.push({ id: docId, ok: false, error: "not_found" });
        continue;
      }

      // Check references
      const refs: string[] = [];
      const [expenseCount, qrCount, scheduledCheckCount] = await Promise.all([
        prisma.expense.count({ where: { documentId: docId, companyId: cid } }),
        prisma.qrAssignment.count({ where: { documentId: docId, companyId: cid } }),
        prisma.scheduledCheck.count({ where: { documentId: docId, companyId: cid } }),
      ]);
      if (expenseCount > 0) refs.push(`${expenseCount} expense(s)`);
      if (qrCount > 0) refs.push(`${qrCount} QR assignment(s)`);
      if (scheduledCheckCount > 0) refs.push(`${scheduledCheckCount} scheduled check(s)`);

      if (refs.length > 0 && !force) {
        results.push({ id: docId, ok: false, error: "has_references", references: refs });
        continue;
      }

      const deleted = await softDeleteDocument(docId, cid);
      if (deleted) {
        totalBytesFreed += doc.sizeBytes;
        results.push({ id: docId, ok: true, bytesFreed: doc.sizeBytes });
      } else {
        results.push({ id: docId, ok: false, error: "delete_failed" });
      }
    }

    // Audit log for the bulk operation
    await prisma.opsAuditLog.create({
      data: {
        action: "storage.bulk_cleanup",
        actorId: authCtx.userId,
        payload: {
          companyId: cid,
          documentIds,
          force,
          requestedCount: documentIds.length,
        },
        result: {
          ok: true,
          deletedCount: results.filter((r) => r.ok).length,
          skippedCount: results.filter((r) => !r.ok).length,
          totalBytesFreed,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      results,
      totalBytesFreed,
      deletedCount: results.filter((r) => r.ok).length,
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    logError(error, { route: "POST /api/admin/storage/cleanup" });
    return NextResponse.json({ ok: false, error: "cleanup_failed" }, { status: 500 });
  }
});
