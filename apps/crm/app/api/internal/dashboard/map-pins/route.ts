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
        scheduledAt: true,
        client: { select: { name: true } },
        site: { select: { latitude: true, longitude: true, address1: true, city: true, postcode: true } },
      },
      take: 200,
      orderBy: { createdAt: "desc" },
    });

    // Quotes with located sites
    const quotes = await prisma.quote.findMany({
      where: {
        companyId: authCtx.companyId,
        deletedAt: null,
        status: { in: ["sent", "accepted"] },
        site: {
          latitude: { not: null },
          longitude: { not: null },
        },
      },
      select: {
        id: true,
        quoteNumber: true,
        clientName: true,
        status: true,
        site: { select: { latitude: true, longitude: true, address1: true, city: true, postcode: true } },
      },
      take: 100,
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
      clientName: j.client?.name || null,
      address: [j.site.address1, j.site.city].filter(Boolean).join(", ") || null,
      postcode: j.site.postcode || null,
      scheduledAt: j.scheduledAt?.toISOString() || null,
    }));

    for (const q of quotes as any[]) {
      if (!q.site) continue;
      pins.push({
        id: `quote_${q.id}`,
        type: "quote",
        status: q.status,
        label: q.quoteNumber ? `Quote #${q.quoteNumber}` : "Quote",
        lat: q.site.latitude,
        lng: q.site.longitude,
        href: `/admin/quotes/${q.id}`,
        clientName: q.clientName || null,
        address: [q.site.address1, q.site.city].filter(Boolean).join(", ") || null,
        postcode: q.site.postcode || null,
        scheduledAt: null,
      });
    }

    return NextResponse.json({ ok: true, pins });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
