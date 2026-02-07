import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { geocodePostcode, extractUKPostcode } from "@/lib/server/geocode";
import { logError } from "@/lib/server/observability";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const { siteId } = await params;
    const existing = await prisma.site.findFirst({
      where: { id: siteId, companyId: authCtx.companyId },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as any;
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    let warning: string | null = null;

    // Copy simple fields
    for (const f of ["name", "address1", "address2", "city", "county", "country", "notes"] as const) {
      if (typeof body[f] === "string") data[f] = body[f].trim();
    }

    // Handle postcode + geocoding
    let newPostcode = typeof body.postcode === "string" ? body.postcode.trim() : undefined;

    // If no postcode provided but address1 is being updated, try to extract one
    const newAddress1 = typeof body.address1 === "string" ? body.address1.trim() : undefined;
    if (newPostcode === undefined && !existing.postcode && !existing.latitude) {
      const addrSource = newAddress1 ?? existing.address1;
      if (addrSource) {
        const extracted = extractUKPostcode(addrSource);
        if (extracted) newPostcode = extracted;
      }
    }

    const postcodeChanged = newPostcode !== undefined && newPostcode !== existing.postcode;

    if (postcodeChanged) {
      data.postcode = newPostcode || null;
      if (newPostcode) {
        const geo = await geocodePostcode(newPostcode);
        if (geo) {
          data.latitude = geo.latitude;
          data.longitude = geo.longitude;
        } else {
          data.latitude = null;
          data.longitude = null;
          warning = "geocode_failed";
        }
      } else {
        data.latitude = null;
        data.longitude = null;
      }
    }

    data.updatedAt = new Date();

    const site = await prisma.site.update({
      where: { id: siteId },
      data,
    });

    return NextResponse.json({ ok: true, site, ...(warning ? { warning } : {}) });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(err, { route: "/api/admin/sites/[siteId]", action: "patch" });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}
