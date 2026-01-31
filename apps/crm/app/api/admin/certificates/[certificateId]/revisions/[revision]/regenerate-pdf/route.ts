import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { writeUploadBytes } from "@/lib/server/storage";
import { getRouteParams } from "@/lib/server/routeParams";
import { renderCertificatePdfFromSnapshot } from "@/lib/server/pdf";
import { computeChecksum } from "@/lib/server/certs/canonical";

export const runtime = "nodejs";

/**
 * POST: Force-regenerate PDF for a specific revision.
 *
 * Useful after PDF template updates — the signing hash stays the same
 * (it's a content hash, not a PDF hash), but pdfChecksum will change
 * and pdfGeneratedAt is updated so support can see when it was last rendered.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ certificateId: string; revision: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const params = await getRouteParams(ctx);
    const certificateId = params.certificateId;
    const revisionNum = parseInt(params.revision, 10);
    if (isNaN(revisionNum) || revisionNum < 1) {
      return NextResponse.json({ ok: false, error: "invalid_revision" }, { status: 400 });
    }

    // Verify certificate belongs to company
    const cert = await prisma.certificate.findFirst({
      where: { id: certificateId, companyId: authCtx.companyId },
      select: { id: true, verificationToken: true },
    });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const revision = await prisma.certificateRevision.findFirst({
      where: { certificateId, companyId: authCtx.companyId, revision: revisionNum },
    });
    if (!revision) return NextResponse.json({ ok: false, error: "revision_not_found" }, { status: 404 });
    if (!revision.content) {
      return NextResponse.json({ ok: false, error: "revision_has_no_content_snapshot" }, { status: 400 });
    }

    // Regenerate from immutable snapshot
    const snapshot = revision.content as any;
    const publicBase = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const verifyUrl = publicBase && cert.verificationToken ? `${publicBase.replace(/\/$/, "")}/verify/${cert.verificationToken}` : undefined;
    const pdfBytes = await renderCertificatePdfFromSnapshot(snapshot, {
      verifyUrl,
      signingHashShort: revision.signingHash?.slice(0, 12),
    });
    const pdfKey = revision.pdfKey || `certificates/${certificateId}/revisions/${revisionNum}.pdf`;
    const pdfChecksum = computeChecksum(pdfBytes);
    const pdfGeneratedAt = new Date();

    writeUploadBytes(pdfKey, pdfBytes);

    await prisma.certificateRevision.update({
      where: { id: revision.id },
      data: { pdfKey, pdfChecksum, pdfGeneratedAt },
    });

    // Also update legacy flat path
    try {
      writeUploadBytes(`certificates/${certificateId}.pdf`, pdfBytes);
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      ok: true,
      revision: revisionNum,
      pdfKey,
      pdfChecksum,
      pdfGeneratedAt: pdfGeneratedAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "regenerate_failed" }, { status: 500 });
  }
}
