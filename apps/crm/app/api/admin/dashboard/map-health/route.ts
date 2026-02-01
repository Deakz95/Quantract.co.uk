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

    const cid = authCtx.companyId;

    const [
      sitesTotal,
      sitesWithPostcode,
      sitesWithLatLng,
      jobsTotal,
      jobsWithSite,
      jobsWithMappableSite,
    ] = await Promise.all([
      prisma.site.count({ where: { companyId: cid } }),
      prisma.site.count({ where: { companyId: cid, postcode: { not: null } } }),
      prisma.site.count({
        where: { companyId: cid, latitude: { not: null }, longitude: { not: null } },
      }),
      prisma.job.count({ where: { companyId: cid, deletedAt: null } }),
      prisma.job.count({ where: { companyId: cid, deletedAt: null, siteId: { not: null } } }),
      prisma.job.count({
        where: {
          companyId: cid,
          deletedAt: null,
          site: { latitude: { not: null }, longitude: { not: null } },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      sitesTotal,
      sitesWithPostcode,
      sitesWithLatLng,
      jobsTotal,
      jobsWithSite,
      jobsWithMappableSite,
    });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
