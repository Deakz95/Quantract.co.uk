import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

/**
 * GET /api/engineer/jobs/[jobId]
 * Returns a shaped job detail payload for the authenticated engineer.
 */
export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
    try {
      const { jobId } = await getRouteParams(ctx);
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "engineer" && role !== "admin") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      // Find engineer record for this user
      const engineer = await prisma.engineer.findFirst({
        where: {
          companyId: authCtx.companyId,
          OR: [
            { email: authCtx.email },
            { users: { some: { id: authCtx.userId } } },
          ],
        },
      });
      if (!engineer) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }

      // Load job — must belong to this engineer + company
      const job = await prisma.job.findFirst({
        where: {
          id: jobId,
          companyId: authCtx.companyId,
          engineerId: engineer.id,
        },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true } },
          site: { select: { id: true, name: true, address1: true, city: true, postcode: true } },
        },
      });
      if (!job) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }

      // Load related data in parallel
      const [stages, variations, certs] = await Promise.all([
        prisma.jobStage.findMany({
          where: { jobId },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, status: true, sortOrder: true },
        }),
        prisma.variation.findMany({
          where: { jobId },
          orderBy: { createdAt: "desc" },
          include: { jobStage: { select: { name: true } } },
          // Select only what we need
        }).then((rows: any[]) => rows.map((v) => ({
          id: v.id,
          title: v.title,
          status: v.status,
          total: v.total,
          stageName: v.jobStage?.name ?? null,
        }))),
        prisma.certificate.findMany({
          where: { jobId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            status: true,
            certificateNumber: true,
            completedAt: true,
            updatedAt: true,
            pdfKey: true,
          },
        }).then(async (rows: any[]) => {
          // Look up Document IDs for issued certificates with pdfKeys
          const pdfKeys = rows.filter((c) => c.pdfKey).map((c) => c.pdfKey);
          let docMap = new Map<string, string>();
          if (pdfKeys.length > 0) {
            const docs = await prisma.document.findMany({
              where: { companyId: authCtx.companyId, storageKey: { in: pdfKeys } },
              select: { id: true, storageKey: true },
            });
            docMap = new Map(docs.map((d: any) => [d.storageKey, d.id]));
          }
          return rows.map((c) => ({
            id: c.id,
            type: c.type,
            status: c.status,
            certificateNumber: c.certificateNumber ?? null,
            completedAtISO: c.completedAt ? c.completedAt.toISOString() : null,
            updatedAtISO: c.updatedAt ? c.updatedAt.toISOString() : null,
            documentId: (c.pdfKey && docMap.get(c.pdfKey)) ?? null,
          }));
        }),
      ]);

      return NextResponse.json({
        ok: true,
        job: {
          id: job.id,
          jobNumber: (job as any).jobNumber ?? null,
          title: job.title ?? null,
          status: job.status,
          scheduledAtISO: (job as any).scheduledAt
            ? new Date((job as any).scheduledAt).toISOString()
            : null,
          notes: job.notes ?? null,
          stockConsumedAtISO: (job as any).stockConsumedAt
            ? new Date((job as any).stockConsumedAt).toISOString()
            : null,
          budgetTotal: (job as any).budgetTotal ?? 0,
          client: job.client ? { name: job.client.name, email: (job.client as any).email ?? null, phone: (job.client as any).phone ?? null } : null,
          site: job.site
            ? {
                name: job.site.name,
                address1: (job.site as any).address1 ?? null,
                city: (job.site as any).city ?? null,
                postcode: (job.site as any).postcode ?? null,
              }
            : null,
        },
        stages,
        variations,
        certs,
      });
    } catch (error: any) {
      if (error?.status === 401) {
        return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      }
      if (error?.status === 403) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
      logError(error, { route: "/api/engineer/jobs/[jobId]", action: "get" });
      return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
    }
  },
);
