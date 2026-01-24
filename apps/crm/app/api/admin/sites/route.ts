import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";

export async function GET(req: Request) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim() || "";
  if (!clientId) return NextResponse.json({ ok: true, sites: [] });

  const sites = await repo.listSitesForClient(clientId);
  return NextResponse.json({ ok: true, sites });
}

export async function POST(req: Request) {
  const authCtx = await requireRoles("admin");
  if (!authCtx) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as any;
  const clientId = String(body?.clientId ?? "").trim();
  if (!clientId) return NextResponse.json({ ok: false, error: "Missing clientId" }, { status: 400 });

  const site = await repo.createSite({
    clientId,
    name: typeof body?.name === "string" ? body.name : undefined,
    address1: typeof body?.address1 === "string" ? body.address1 : undefined,
    address2: typeof body?.address2 === "string" ? body.address2 : undefined,
    city: typeof body?.city === "string" ? body.city : undefined,
    county: typeof body?.county === "string" ? body.county : undefined,
    postcode: typeof body?.postcode === "string" ? body.postcode : undefined,
    country: typeof body?.country === "string" ? body.country : undefined,
    notes: typeof body?.notes === "string" ? body.notes : undefined,
  });
  if (!site) return NextResponse.json({ ok: false, error: "Create failed" }, { status: 500 });

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

  return NextResponse.json({ ok: true, site });
}
