import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";
import { timeStart, logPerf } from "@/lib/perf/timing";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  const stopTotal = timeStart("clients_list_total");
  let msAuth = 0;
  let msDb = 0;

  try {
    const stopAuth = timeStart("clients_list_auth");
    const ctx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(ctx);
    msAuth = stopAuth();

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      logPerf("clients_list", { msTotal: stopTotal(), msAuth, ok: false, err: "forbidden" });
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      logPerf("clients_list", { msTotal: stopTotal(), msAuth, ok: false, err: "service_unavailable" });
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const stopDb = timeStart("clients_list_db");
    const clients = await client.client.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        phone: true,
        address1: true,
        address2: true,
        city: true,
        county: true,
        postcode: true,
        country: true,
        notes: true,
        paymentTermsDays: true,
        disableAutoChase: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    msDb = stopDb();

    // Map Date fields to ISO strings for frontend compatibility
    const mapped = (clients || []).map((c: any) => ({
      ...c,
      createdAtISO: c.createdAt ? new Date(c.createdAt).toISOString() : null,
      updatedAtISO: c.updatedAt ? new Date(c.updatedAt).toISOString() : null,
    }));

    logPerf("clients_list", { msTotal: stopTotal(), msAuth, msDb, ok: true, rowCount: mapped.length });
    return NextResponse.json({ ok: true, clients: mapped });
  } catch (error: any) {
    // Handle auth errors with appropriate status codes
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/clients", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/clients", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    // Use requireCompanyContext for company-scoped data access
    const ctx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(ctx);

    // Only admin can create clients
    if (effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as any;
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!name || !email) {
      return NextResponse.json(
        { ok: false, error: "name_and_email_required" },
        { status: 400 }
      );
    }

    // companyId is guaranteed non-null by requireCompanyContext
    const created = await client.client.create({
      data: {
        id: randomUUID(),
        companyId: ctx.companyId,
        name,
        email,
        phone: body?.phone ? String(body.phone).trim() : null,
        address1: body?.address1 ? String(body.address1).trim() : null,
        address2: body?.address2 ? String(body.address2).trim() : null,
        city: body?.city ? String(body.city).trim() : null,
        county: body?.county ? String(body.county).trim() : null,
        postcode: body?.postcode ? String(body.postcode).trim() : null,
        country: body?.country ? String(body.country).trim() : null,
        notes: body?.notes ? String(body.notes).trim() : null,
        paymentTermsDays: body?.paymentTermsDays != null ? Number(body.paymentTermsDays) : null,
        disableAutoChase: body?.disableAutoChase != null ? Boolean(body.disableAutoChase) : false,
        updatedAt: new Date(),
      },
    });

    // Audit event for client creation
    await repo.recordAuditEvent({
      entityType: "client",
      entityId: created.id,
      action: "client.created",
      actorRole: effectiveRole,
      actor: ctx.email,
      meta: { name, email },
    });

    return NextResponse.json({ ok: true, client: created });
  } catch (error: any) {
    // Handle auth errors with appropriate status codes
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/clients", action: "create" });
      if (error.code === "P2002") {
        return NextResponse.json({ ok: false, error: "A client with this email already exists" }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/clients", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
