import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { createSignedUrl } from "@/lib/server/documents";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";

/**
 * POST /api/documents/[documentId]/signed-url
 *
 * Returns a short-lived signed URL for the document.
 * Requires authenticated user with company context.
 * Roles: admin, office, finance, engineer (all company members).
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ documentId: string }> },
) {
  let session;
  try {
    session = await requireCompanyContext();
  } catch (e: any) {
    const status = e?.status || 401;
    return NextResponse.json({ ok: false, error: e?.message || "Unauthorized" }, { status });
  }

  const { documentId } = await getRouteParams(ctx);

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
  }

  // Verify document belongs to the user's company
  const doc = await prisma.document.findFirst({
    where: { id: documentId, companyId: session.companyId },
  });

  if (!doc) {
    return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
  }

  // External URL documents — return the external URL directly
  if (doc.storageProvider === "external_url" && doc.externalUrl) {
    if (!doc.externalUrl.startsWith("https://")) {
      return NextResponse.json({ ok: false, error: "Invalid external URL scheme" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, url: doc.externalUrl, external: true });
  }

  const expiresInSeconds = 300; // 5 minutes
  const url = createSignedUrl(documentId, expiresInSeconds);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  return NextResponse.json({ ok: true, url, expiresAt });
}
