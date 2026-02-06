import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;

    const url = new URL(req.url);
    const now = new Date();
    const from = parseDateParam(url.searchParams.get("from"), new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    const to = parseDateParam(url.searchParams.get("to"), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));

    // Jobs that are active (not completed/cancelled/draft) and have NO non-deleted schedule entry in the date range
    const excludedStatuses = ["completed", "cancelled", "draft"];

    // Two-step approach: first get all active jobs, then filter out those with schedule entries.
    // The nested NOT > scheduleEntries > some pattern can fail on some Prisma/Postgres versions.
    const [allJobs, scheduledJobIds] = await Promise.all([
      prisma.job.findMany({
        where: {
          companyId: cid,
          status: { notIn: excludedStatuses },
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          status: true,
          scheduledAt: true,
          client: { select: { id: true, companyName: true } },
          site: { select: { id: true, name: true, postcode: true } },
          engineer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.scheduleEntry.findMany({
        where: {
          companyId: cid,
          deletedAt: null,
          startAt: { lt: to },
          endAt: { gt: from },
        },
        select: { jobId: true },
        distinct: ["jobId"],
      }).then((rows: any[]) => new Set(rows.map((r: any) => r.jobId))),
    ]);

    const jobs = allJobs.filter((j: any) => !scheduledJobIds.has(j.id)).slice(0, 100);

    return NextResponse.json({
      ok: true,
      jobs: jobs.map((j: typeof jobs[number]) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        scheduledAt: j.scheduledAt?.toISOString(),
        clientName: j.client?.companyName,
        siteName: j.site?.name,
        sitePostcode: j.site?.postcode,
        engineerId: j.engineer?.id,
        engineerName: j.engineer?.name,
      })),
    });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/schedule/unassigned", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
