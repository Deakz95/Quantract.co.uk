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

    // Debug counts (dev only, no PII)
    if (process.env.NODE_ENV !== "production") {
      const [totalJobs, jobsWithSite, sitesWithPostcode, sitesWithLatLng] =
        await Promise.all([
          prisma.job.count({
            where: { companyId: authCtx.companyId, deletedAt: null, createdAt: { gte: ninetyDaysAgo } },
          }),
          prisma.job.count({
            where: { companyId: authCtx.companyId, deletedAt: null, createdAt: { gte: ninetyDaysAgo }, siteId: { not: null } },
          }),
          prisma.site.count({
            where: { companyId: authCtx.companyId, postcode: { not: null } },
          }),
          prisma.site.count({
            where: { companyId: authCtx.companyId, latitude: { not: null }, longitude: { not: null } },
          }),
        ]);
      console.log("[map-pins debug]", { totalJobs, jobsWithSite, sitesWithPostcode, sitesWithLatLng });
    }

    // Jobs with located sites — include engineer, quote link, and invoices
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
        quoteId: true,
        budgetTotal: true,
        client: { select: { name: true } },
        site: { select: { latitude: true, longitude: true, address1: true, city: true, postcode: true } },
        engineer: { select: { name: true } },
        invoices: {
          where: { deletedAt: null },
          select: { id: true, total: true, paidAt: true },
        },
      },
      take: 200,
      orderBy: { createdAt: "desc" },
    });

    // Quotes with located sites — include items for value, linked jobs
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
        items: true,
        vatRate: true,
        site: { select: { latitude: true, longitude: true, address1: true, city: true, postcode: true } },
        jobs: {
          where: { deletedAt: null },
          select: { id: true },
          take: 1,
        },
      },
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    const isEngineer = role === "engineer";

    // Track which quoteIds have jobs so we can nest them instead of showing duplicate pins
    const quoteIdsWithJobs = new Set<string>();
    for (const j of jobs as any[]) {
      if (j.quoteId) quoteIdsWithJobs.add(j.quoteId);
    }

    const pins: any[] = jobs.map((j: any) => {
      const invoiceCount = j.invoices?.length || 0;
      const paidCount = j.invoices?.filter((inv: any) => inv.paidAt != null).length || 0;
      const invoiceTotal = j.invoices?.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0;

      return {
        id: `job_${j.id}`,
        type: "job",
        status: j.status,
        label: j.title || (j.jobNumber ? `Job #${j.jobNumber}` : "Job"),
        ref: j.jobNumber ? `J-${String(j.jobNumber).padStart(4, "0")}` : null,
        lat: j.site.latitude,
        lng: j.site.longitude,
        href: isEngineer ? `/engineer/jobs/${j.id}` : `/admin/jobs/${j.id}`,
        clientName: j.client?.name || null,
        address: [j.site.address1, j.site.city].filter(Boolean).join(", ") || null,
        postcode: j.site.postcode || null,
        scheduledAt: j.scheduledAt?.toISOString() || null,
        engineerName: j.engineer?.name || null,
        totalValue: j.budgetTotal || null,
        invoiceCount,
        paidCount,
        invoiceTotal,
        linkedQuoteId: j.quoteId || null,
        linkedQuoteHref: j.quoteId ? `/admin/quotes/${j.quoteId}` : null,
      };
    });

    for (const q of quotes as any[]) {
      if (!q.site) continue;
      // Skip quotes that already have a job pin — their info is nested via linkedQuoteId
      if (quoteIdsWithJobs.has(q.id)) continue;

      // Calculate quote value from items JSON
      let quoteValue: number | null = null;
      if (Array.isArray(q.items)) {
        const subtotal = q.items.reduce((sum: number, item: any) => {
          const qty = typeof item.quantity === "number" ? item.quantity : 1;
          const rate = typeof item.rate === "number" ? item.rate : (typeof item.unitPrice === "number" ? item.unitPrice : 0);
          return sum + qty * rate;
        }, 0);
        const vat = subtotal * (typeof q.vatRate === "number" ? q.vatRate : 0);
        quoteValue = subtotal + vat;
      }

      const linkedJobId = q.jobs?.[0]?.id || null;

      pins.push({
        id: `quote_${q.id}`,
        type: "quote",
        status: q.status,
        label: q.quoteNumber ? `Quote #${q.quoteNumber}` : "Quote",
        ref: q.quoteNumber || null,
        lat: q.site.latitude,
        lng: q.site.longitude,
        href: `/admin/quotes/${q.id}`,
        clientName: q.clientName || null,
        address: [q.site.address1, q.site.city].filter(Boolean).join(", ") || null,
        postcode: q.site.postcode || null,
        scheduledAt: null,
        engineerName: null,
        totalValue: quoteValue,
        invoiceCount: 0,
        paidCount: 0,
        invoiceTotal: 0,
        linkedJobId,
        linkedJobHref: linkedJobId ? (isEngineer ? `/engineer/jobs/${linkedJobId}` : `/admin/jobs/${linkedJobId}`) : null,
      });
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[map-pins debug] pinsReturned:", pins.length);
    }

    return NextResponse.json({ ok: true, pins });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
