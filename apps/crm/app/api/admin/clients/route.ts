import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";

export const GET = withRequestLogging(async function GET() {
  try {
    await requireRole("admin");
    const clients = await repo.listClients();
    return NextResponse.json({ ok: true, clients });
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireRole("admin");

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
      meta: {
        name,
        email,
      },
    });

    return NextResponse.json({ ok: true, client: created });
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
});
