import { NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { getPrisma } from "@/lib/server/prisma";
import { requireClientOrPortalSession } from "@/lib/server/portalAuth";

type RouteContext = { params: Promise<{ jobId: string }> };

/**
 * GET /api/client/jobs/[jobId]
 *
 * Returns job detail with timeline events (status changes, certificates, invoices)
 * for the authenticated client. Scoped to companyId + clientId.
 * Supports both full client sessions and read-only portal sessions.
 */
export const GET = withRequestLogging(async function GET(_req: Request, ctx: RouteContext) {
  try {
    const session = await requireClientOrPortalSession();
    const { jobId } = await ctx.params;

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        companyId: session.companyId,
        clientId: session.clientId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
        updatedAt: true,
        notes: true,
        site: {
          select: {
            name: true,
            address1: true,
            address2: true,
            city: true,
            postcode: true,
          },
        },
        certificates: {
          where: { status: "issued" },
          select: {
            id: true,
            type: true,
            certificateNumber: true,
            issuedAt: true,
            outcome: true,
          },
          orderBy: { issuedAt: "desc" },
        },
        scheduleEntries: {
          where: { deletedAt: null },
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            status: true,
          },
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    });

    if (!job) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Build timeline from available data
    const timeline: Array<{
      id: string;
      ts: string;
      type: string;
      title: string;
      subtitle?: string;
    }> = [];

    // Job created
    timeline.push({
      id: `job-created-${job.id}`,
      ts: job.createdAt.toISOString(),
      type: "job_created",
      title: "Job created",
    });

    // Scheduled visits
    for (const entry of job.scheduleEntries) {
      timeline.push({
        id: `visit-${entry.id}`,
        ts: entry.date.toISOString(),
        type: "visit",
        title: `Visit ${entry.status === "completed" ? "completed" : "scheduled"}`,
        subtitle: entry.startTime && entry.endTime ? `${entry.startTime} - ${entry.endTime}` : undefined,
      });
    }

    // Certificates issued
    for (const cert of job.certificates) {
      timeline.push({
        id: `cert-${cert.id}`,
        ts: cert.issuedAt?.toISOString() ?? job.updatedAt.toISOString(),
        type: "certificate_issued",
        title: `${cert.type} Certificate issued`,
        subtitle: cert.certificateNumber ?? undefined,
      });
    }

    // Sort timeline by date descending
    timeline.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    const result = {
      id: job.id,
      title: job.title || "Untitled Job",
      status: job.status,
      scheduledAt: job.scheduledAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      site: job.site
        ? {
            name: job.site.name,
            address: [job.site.address1, job.site.address2, job.site.city, job.site.postcode]
              .filter(Boolean)
              .join(", "),
          }
        : null,
      certificates: job.certificates.map((c: any) => ({
        id: c.id,
        type: c.type,
        certificateNumber: c.certificateNumber,
        issuedAt: c.issuedAt?.toISOString() ?? null,
        outcome: c.outcome,
      })),
      timeline,
    };

    return NextResponse.json({ ok: true, job: result });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    console.error("[client/jobs/[jobId]] Error:", e);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
