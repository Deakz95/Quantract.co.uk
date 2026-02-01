import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Jobs with located sites
    const jobs = await prisma.job.findMany({
      where: {
        companyId: authCtx.companyId,
        deletedAt: null,
        createdAt: { gte: ninetyDaysAgo },
        site: {
          latitude: { not: null },
          longitude: { not: null },
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        jobNumber: true,
        site: { select: { latitude: true, longitude: true } },
      },
      take: 200,
      orderBy: { createdAt: "desc" },
    });

    const isEngineer = role === "engineer";
    const pins: any[] = jobs.map((j: any) => ({
      id: `job_${j.id}`,
      type: "job",
      status: j.status,
      label: j.title || (j.jobNumber ? `Job #${j.jobNumber}` : "Job"),
      lat: j.site.latitude,
      lng: j.site.longitude,
      href: isEngineer ? `/engineer/jobs/${j.id}` : `/admin/jobs/${j.id}`,
    }));

    return NextResponse.json({ ok: true, pins });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
