import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

/**
 * Public JSON verification record download.
 * No auth required — security is via non-guessable 48-char hex token.
 * Returns the latest issued revision's canonical snapshot + metadata.
 * No internal DB IDs are exposed.
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

  const cert = await prisma.certificate.findUnique({
    where: { verificationToken: token },
    select: {
      id: true,
      status: true,
      type: true,
      certificateNumber: true,
      outcome: true,
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
    return NextResponse.json(
      { ok: false, error: "Verification has been revoked. JSON download is unavailable." },
      { status: 403 },
    );
  }

  const revision = await prisma.certificateRevision.findFirst({
    where: { certificateId: cert.id },
    orderBy: { revision: "desc" },
    select: {
      revision: true,
      signingHash: true,
      pdfChecksum: true,
      issuedAt: true,
      content: true,
    },
  });

  if (!revision) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const payload = {
    schemaVersion: "1.0.0",
    certificateNumber: cert.certificateNumber ?? null,
    type: cert.type,
    revision: revision.revision,
    issuedAt: revision.issuedAt ? new Date(revision.issuedAt).toISOString() : null,
    signingHash: revision.signingHash,
    pdfChecksum: revision.pdfChecksum ?? null,
    outcome: cert.outcome ?? null,
    snapshot: revision.content,
  };

  const certNum = cert.certificateNumber || "certificate";
  const filename = `${certNum}_rev${revision.revision}_verification.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "public, max-age=300",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
