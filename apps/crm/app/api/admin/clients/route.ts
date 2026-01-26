import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";

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

    try {
      const clients = await repo.listClients();
      return NextResponse.json({ ok: true, clients: clients || [] });
    } catch (dbError) {
      logError(dbError, { route: "/api/admin/clients", action: "list" });
      return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
    }
  } catch (error) {
    logError(error, { route: "/api/admin/clients", action: "get" });
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
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

    try {
      const body = (await req.json().catch(() => null)) as any;
      const name = String(body?.name ?? "").trim();
      const email = String(body?.email ?? "").trim().toLowerCase();

      if (!name || !email) {
        return NextResponse.json(
          { ok: false, error: "name_and_email_required" },
          { status: 400 }
        );
      }

      const created = await repo.createClient({
        name,
        email,
        phone: body?.phone ? String(body.phone).trim() : undefined,
        address1: body?.address1 ? String(body.address1).trim() : undefined,
        address2: body?.address2 ? String(body.address2).trim() : undefined,
        city: body?.city ? String(body.city).trim() : undefined,
        county: body?.county ? String(body.county).trim() : undefined,
        postcode: body?.postcode ? String(body.postcode).trim() : undefined,
        country: body?.country ? String(body.country).trim() : undefined,
        notes: body?.notes ? String(body.notes).trim() : undefined,
        paymentTermsDays:
          body?.paymentTermsDays != null ? Number(body.paymentTermsDays) : undefined,
        disableAutoChase:
          body?.disableAutoChase != null ? Boolean(body.disableAutoChase) : undefined,
      } as any);

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
    } catch (dbError) {
      logError(dbError, { route: "/api/admin/clients", action: "create" });
      return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
    }
  } catch (error) {
    logError(error, { route: "/api/admin/clients", action: "post" });
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
});
