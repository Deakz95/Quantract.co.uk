import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { createSignedUrl } from "@/lib/server/documents";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/client/documents
 *
 * Returns all Document records associated with the authenticated client's company,
 * scoped by the client's email (via their Client record). Each document includes
 * a time-limited signed URL for secure download — no raw storage keys are exposed.
 *
 * Auth model: session-based (requireRole("client") + getUserEmail()).
 */
export const GET = withRequestLogging(async function GET() {
  try {
    await requireRole("client");

    const email = ((await getUserEmail()) || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    // Derive client identity from session — never from a client-supplied param
    const client = await prisma.client.findFirst({
      where: { email },
      select: { id: true, companyId: true },
    });

    if (!client) {
      return NextResponse.json({ ok: true, documents: [] });
    }

    const documents = await prisma.document.findMany({
      where: { companyId: client.companyId },
      select: {
        id: true,
        type: true,
        mimeType: true,
        sizeBytes: true,
        originalFilename: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Attach time-limited signed URLs (5 min TTL) — never expose storageKey
    const items = documents.map((doc: { id: string; type: string; mimeType: string; sizeBytes: number; originalFilename: string | null; createdAt: Date }) => ({
      id: doc.id,
      type: doc.type,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      filename: doc.originalFilename,
      createdAt: doc.createdAt.toISOString(),
      downloadUrl: createSignedUrl(doc.id),
    }));

    return NextResponse.json({ ok: true, documents: items });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
