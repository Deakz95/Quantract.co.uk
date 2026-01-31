import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { readUploadBytes, writeUploadBytes } from "@/lib/server/storage";
import { renderCertificatePdfFromSnapshot } from "@/lib/server/pdf";
import { computeChecksum } from "@/lib/server/certs/canonical";

export const runtime = "nodejs";

/**
 * Public PDF download for verified certificates.
 * No auth required — security is via non-guessable 48-char hex token.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length < 10) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
  }

  // Lookup by unique token
  const cert = await prisma.certificate.findUnique({
    where: { verificationToken: token },
    select: {
      id: true,
      status: true,
      certificateNumber: true,
      verificationRevokedAt: true,
    },
  });

  if (!cert) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (cert.status !== "issued") {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (cert.verificationRevokedAt) {
    return NextResponse.json({ ok: false, error: "Verification has been revoked." }, { status: 403 });
  }

  // Find latest revision
  const revision = await prisma.certificateRevision.findFirst({
    where: { certificateId: cert.id },
    orderBy: { revision: "desc" },
    select: { id: true, revision: true, pdfKey: true, signingHash: true, content: true },
  });

  if (!revision) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Try reading existing PDF
  let bytes: Buffer | null = null;
  if (revision.pdfKey) {
    bytes = readUploadBytes(revision.pdfKey);
  }

  // Self-heal: regenerate from immutable snapshot if missing
  if (!bytes && revision.content) {
    try {
      const snapshot = revision.content as any;
      const publicBase = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
      const verifyUrl = publicBase ? `${publicBase.replace(/\/$/, "")}/verify/${token}` : undefined;

      const regenerated = await renderCertificatePdfFromSnapshot(snapshot, {
        verifyUrl,
        signingHashShort: revision.signingHash?.slice(0, 12),
      });
      const pdfKey = revision.pdfKey || `certificates/${cert.id}/revisions/${revision.revision}.pdf`;
      const pdfChecksum = computeChecksum(regenerated);

      writeUploadBytes(pdfKey, regenerated);

      await prisma.certificateRevision.update({
        where: { id: revision.id },
        data: { pdfKey, pdfChecksum, pdfGeneratedAt: new Date() },
      });

      bytes = regenerated;
      console.log(`[Public PDF self-heal] Regenerated PDF for cert ${cert.id} rev ${revision.revision}`);
    } catch (err) {
      console.error(`[Public PDF self-heal] Failed for cert ${cert.id}:`, err);
      return NextResponse.json({ ok: false, error: "pdf_unavailable" }, { status: 500 });
    }
  }

  if (!bytes) {
    return NextResponse.json({ ok: false, error: "pdf_unavailable" }, { status: 404 });
  }

  const certNum = cert.certificateNumber || cert.id.slice(0, 8);
  const filename = `certificate_${certNum}_rev${revision.revision}.pdf`;

  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "public, max-age=300",
    },
  });
}
