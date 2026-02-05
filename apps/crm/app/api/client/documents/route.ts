import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { createSignedUrl } from "@/lib/server/documents";
import { withRequestLogging } from "@/lib/server/observability";
import { requireClientOrPortalSession } from "@/lib/server/portalAuth";

export const runtime = "nodejs";

/**
 * GET /api/client/documents
 *
 * Returns all Document records associated with the authenticated client's company,
 * scoped by companyId from the session. Each document includes a time-limited
 * signed URL for secure download — no raw storage keys are exposed.
 *
 * Supports both full client sessions and read-only portal sessions.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const ctx = await requireClientOrPortalSession();

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    // Scope documents to those associated with the client's certificates
    // via QrAssignment, ensuring clients can only see their own documents.
    // We also include documents directly linked to certificates belonging to this client.
    const documents = await prisma.document.findMany({
      where: {
        companyId: ctx.companyId,
        deletedAt: null,
        OR: [
          // Documents linked via QrAssignment to certificates owned by this client
          {
            qrAssignments: {
              some: {
                certificate: {
                  clientId: ctx.clientId,
                },
              },
            },
          },
          // Documents linked via QrAssignment directly to this client's certificates
          {
            qrAssignments: {
              some: {
                certificate: {
                  job: {
                    clientId: ctx.clientId,
                  },
                },
              },
            },
          },
        ],
      },
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
    console.error("[client/documents] Error:", e);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
