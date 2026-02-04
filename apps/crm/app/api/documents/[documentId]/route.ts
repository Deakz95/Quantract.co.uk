import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getDocumentBytes, verifySignedToken } from "@/lib/server/documents";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";

/**
 * GET /api/documents/[documentId]
 *
 * Two auth modes:
 *   1. Authenticated user (cookie or Bearer) — document.companyId must match
 *   2. Signed token from query params — HMAC-verified, time-limited
 *
 * Returns the document bytes with correct Content-Type and Content-Disposition.
 * Storage keys are never exposed to the client.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await getRouteParams(ctx);
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const expires = url.searchParams.get("expires");

  let companyId: string;

  if (token && expires) {
    // Signed-token auth mode
    if (!verifySignedToken(documentId, token, expires)) {
      return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 403 });
    }
    // Look up the document without company scoping (token is proof of access)
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
    }
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    companyId = doc.companyId;
  } else {
    // Authenticated user mode
    try {
      const session = await requireCompanyContext();
      companyId = session.companyId;
    } catch (e: any) {
      const status = e?.status || 401;
      return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status });
    }
  }

  // Check if the document has an externalUrl — redirect to it
  const prisma2 = getPrisma();
  if (prisma2) {
    const doc = await prisma2.document.findFirst({
      where: { id: documentId, companyId },
      select: { externalUrl: true, storageProvider: true },
    });
    if (doc?.storageProvider === "external_url" && doc.externalUrl) {
      // Validate https-only to prevent open-redirect abuse
      if (!doc.externalUrl.startsWith("https://")) {
        return NextResponse.json({ ok: false, error: "Invalid external URL scheme" }, { status: 400 });
      }
      return NextResponse.redirect(doc.externalUrl, 302);
    }
  }

  const result = await getDocumentBytes(documentId, companyId);
  if (!result) {
    return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
  }

  const { document, bytes } = result;
  const filename = document.originalFilename || `document-${documentId.slice(0, 8)}.${document.mimeType.split("/")[1] || "bin"}`;

  return new NextResponse(bytes, {
    headers: {
      "content-type": document.mimeType,
      "content-length": String(bytes.length),
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "private, max-age=60",
    },
  });
}
