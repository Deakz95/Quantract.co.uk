import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    // Only admin role can access this endpoint
    if (authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 401 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const clients = await client.client.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, clients: clients || [] });
  } catch (error) {
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
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    // Only admin role can access this endpoint
    if (authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 401 });
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

    const created = await client.client.create({
      data: {
        companyId: authCtx.companyId,
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
      },
    });

    // Audit event for client creation
    await repo.recordAuditEvent({
      entityType: "client",
      entityId: created.id,
      action: "client.created",
      actorRole: "admin",
      actor: authCtx.email,
      meta: { name, email },
    });

    return NextResponse.json({ ok: true, client: created });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/clients", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/clients", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
