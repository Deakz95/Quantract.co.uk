import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";
import { geocodePostcode } from "@/lib/server/geocode";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId")?.trim() || "";
    if (!clientId) return NextResponse.json({ ok: true, sites: [] });

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const sites = await client.site.findMany({
      where: { clientId, companyId: authCtx.companyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, sites: sites || [] });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/sites", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/sites", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as any;
    const clientId = String(body?.clientId ?? "").trim();
    if (!clientId) return NextResponse.json({ ok: false, error: "missing_client_id" }, { status: 400 });

    // Geocode postcode if provided
    const postcode = typeof body?.postcode === "string" ? body.postcode.trim() : null;
    let latitude: number | null = typeof body?.latitude === "number" ? body.latitude : null;
    let longitude: number | null = typeof body?.longitude === "number" ? body.longitude : null;
    let warning: string | null = null;
    if (postcode && latitude == null) {
      const geo = await geocodePostcode(postcode);
      if (geo) { latitude = geo.latitude; longitude = geo.longitude; }
      else { warning = "geocode_failed"; }
    }

    const site = await client.site.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        clientId,
        name: typeof body?.name === "string" ? body.name.trim() : null,
        address1: typeof body?.address1 === "string" ? body.address1.trim() : null,
        address2: typeof body?.address2 === "string" ? body.address2.trim() : null,
        city: typeof body?.city === "string" ? body.city.trim() : null,
        county: typeof body?.county === "string" ? body.county.trim() : null,
        postcode,
        country: typeof body?.country === "string" ? body.country.trim() : null,
        latitude,
        longitude,
        notes: typeof body?.notes === "string" ? body.notes.trim() : null,
        updatedAt: new Date(),
      },
    });

    // Audit event for site creation
    await repo.recordAuditEvent({
      entityType: "site",
      entityId: site.id,
      action: "site.created",
      actorRole: "admin",
      actor: authCtx.email,
      meta: {
        clientId,
        name: site.name,
      },
    });

    return NextResponse.json({ ok: true, site, ...(warning ? { warning } : {}) });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/sites", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/sites", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
