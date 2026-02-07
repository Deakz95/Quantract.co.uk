import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { geocodePostcode, extractUKPostcode } from "@/lib/server/geocode";

export const runtime = "nodejs";

/**
 * POST /api/admin/sites/backfill-geocode
 *
 * One-off backfill: finds all sites belonging to the company that have an
 * address but no lat/lng, extracts postcodes from address strings, geocodes
 * them via postcodes.io, and updates the records.
 *
 * Admin-only. Returns a summary of how many sites were processed.
 */
export async function POST() {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    // Find sites that have some address info but no coordinates
    const sites = await prisma.site.findMany({
      where: {
        companyId: authCtx.companyId,
        latitude: null,
        OR: [
          { address1: { not: null } },
          { postcode: { not: null } },
        ],
      },
      select: {
        id: true,
        address1: true,
        postcode: true,
      },
    });

    let geocoded = 0;
    let postcodeExtracted = 0;
    let failed = 0;
    let skipped = 0;

    for (const site of sites) {
      // Determine postcode: use existing, or extract from address1
      let postcode = site.postcode;
      if (!postcode && site.address1) {
        postcode = extractUKPostcode(site.address1);
        if (postcode) postcodeExtracted++;
      }

      if (!postcode) {
        skipped++;
        continue;
      }

      const geo = await geocodePostcode(postcode);
      if (geo) {
        await prisma.site.update({
          where: { id: site.id },
          data: {
            postcode: postcode,
            latitude: geo.latitude,
            longitude: geo.longitude,
            updatedAt: new Date(),
          },
        });
        geocoded++;
      } else {
        // Still store the extracted postcode even if geocoding fails
        if (!site.postcode && postcode) {
          await prisma.site.update({
            where: { id: site.id },
            data: { postcode, updatedAt: new Date() },
          });
        }
        failed++;
      }

      // Rate-limit: postcodes.io allows ~3 req/s for free
      await new Promise((r) => setTimeout(r, 350));
    }

    return NextResponse.json({
      ok: true,
      total: sites.length,
      geocoded,
      postcodeExtracted,
      failed,
      skipped,
    });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "backfill_failed" }, { status: 500 });
  }
}
