import { NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { getPrisma } from "@/lib/server/prisma";
import { requireClientOrPortalSession } from "@/lib/server/portalAuth";

/**
 * GET /api/client/jobs
 *
 * Returns jobs for the authenticated client, filtered by companyId + clientId.
 * Supports both full client sessions and read-only portal sessions.
 * Rate limited via session-based access control.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const ctx = await requireClientOrPortalSession();

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const jobs = await prisma.job.findMany({
      where: {
        companyId: ctx.companyId,
        clientId: ctx.clientId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
        site: {
          select: {
            name: true,
            address1: true,
            city: true,
            postcode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const items = jobs.map((j: any) => ({
      id: j.id,
      title: j.title || "Untitled Job",
      status: j.status,
      scheduledAt: j.scheduledAt?.toISOString() ?? null,
      createdAt: j.createdAt.toISOString(),
      site: j.site
        ? {
            name: j.site.name,
            address: [j.site.address1, j.site.city, j.site.postcode].filter(Boolean).join(", "),
          }
        : null,
    }));

    return NextResponse.json({ ok: true, jobs: items });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    console.error("[client/jobs] Error:", e);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
