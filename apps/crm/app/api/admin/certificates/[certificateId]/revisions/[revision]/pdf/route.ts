import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { readUploadBytes, writeUploadBytes } from "@/lib/server/storage";
import { getRouteParams } from "@/lib/server/routeParams";
import { renderCertificatePdfFromSnapshot } from "@/lib/server/pdf";
import { computeChecksum } from "@/lib/server/certs/canonical";

export const runtime = "nodejs";

/** GET: stream PDF bytes for a specific revision, with self-healing regeneration */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ certificateId: string; revision: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
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
      select: { certificateNumber: true, verificationToken: true },
    });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Fetch full revision including content for potential regeneration
    const revision = await prisma.certificateRevision.findFirst({
      where: { certificateId, companyId: authCtx.companyId, revision: revisionNum },
      select: { id: true, pdfKey: true, signingHash: true, content: true },
    });
    if (!revision) return NextResponse.json({ ok: false, error: "revision_not_found" }, { status: 404 });

    // Try reading existing PDF
    let bytes: Buffer | null = null;
    if (revision.pdfKey) {
      bytes = readUploadBytes(revision.pdfKey);
    }

    // Self-healing: regenerate PDF from immutable snapshot if missing on disk or pdfKey is null
    if (!bytes && revision.content) {
      try {
        const snapshot = revision.content as any;
        const publicBase = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
        const verifyUrl = publicBase && cert.verificationToken ? `${publicBase.replace(/\/$/, "")}/verify/${cert.verificationToken}` : undefined;
        const regenerated = await renderCertificatePdfFromSnapshot(snapshot, {
          verifyUrl,
          signingHashShort: revision.signingHash?.slice(0, 12),
        });
        const pdfKey = revision.pdfKey || `certificates/${certificateId}/revisions/${revisionNum}.pdf`;
        const pdfChecksum = computeChecksum(regenerated);

        writeUploadBytes(pdfKey, regenerated);

        // Persist the regenerated pdfKey/checksum/timestamp
        await prisma.certificateRevision.update({
          where: { id: revision.id },
          data: { pdfKey, pdfChecksum, pdfGeneratedAt: new Date() },
        });

        bytes = regenerated;
        console.log(`[PDF self-heal] Regenerated PDF for cert ${certificateId} rev ${revisionNum}`);
      } catch (err) {
        console.error(`[PDF self-heal] Failed for cert ${certificateId} rev ${revisionNum}:`, err);
        return NextResponse.json({ ok: false, error: "pdf_regeneration_failed" }, { status: 500 });
      }
    }

    if (!bytes) {
      return NextResponse.json({ ok: false, error: "pdf_unavailable" }, { status: 404 });
    }

    const certNum = cert.certificateNumber || certificateId.slice(0, 8);
    const filename = `certificate-${certNum}-rev${revisionNum}.pdf`;

    return new NextResponse(bytes, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename}"`,
        "cache-control": "private, max-age=86400",
      },
    });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
