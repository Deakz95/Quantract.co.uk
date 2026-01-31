import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { getPrisma } from "@/lib/server/prisma";
function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({
    ok: true,
    ...data
  }, {
    status
  });
}
function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({
    ok: false,
    error: msg
  }, {
    status
  });
}
async function ensureAdmin() {
  // keep your auth model
  await requireRole("admin");
}
function pickDefined<T extends Record<string, any>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  try {
    await ensureAdmin();
    const { clientId } = await getRouteParams(ctx);
    const client = await repo.getClientById(clientId);
    if (!client) return jsonErr("Not found", 404);
    return jsonOk({
      client
    });
  } catch (e) {
    // treat auth errors as 401, everything else 400
    const msg = e instanceof Error ? e.message : "";
    const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
    return jsonErr(e, status);
  }
});
export const PATCH = withRequestLogging(
  async function PATCH(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  try {
    const authCtx = await requireRole("admin");
    const { clientId } = await getRouteParams(ctx);
    const body = (await req.json().catch(() => ({}))) as any;
    const patch = pickDefined({
      name: body?.name,
      email: body?.email,
      phone: body?.phone,
      address1: body?.address1,
      address2: body?.address2,
      city: body?.city,
      county: body?.county,
      postcode: body?.postcode,
      country: body?.country,
      notes: body?.notes,
      paymentTermsDays: body?.paymentTermsDays,
      disableAutoChase: body?.disableAutoChase
    });
    const updated = await repo.updateClient(clientId, patch as any);
    if (!updated) return jsonErr("Not found", 404);

    // Audit event for client update
    await repo.recordAuditEvent({
      entityType: "client",
      entityId: clientId,
      action: "client.updated",
      actorRole: "admin",
      actor: authCtx.email,
      meta: { changes: patch },
    });

    return jsonOk({
      client: updated
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
    return jsonErr(e, status);
  }
});
export const DELETE = withRequestLogging(
  async function DELETE(_req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  try {
    const authCtx = await requireRole("admin");
    const { clientId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return jsonErr("service_unavailable", 503);

    const client = await repo.getClientById(clientId);
    if (!client) return jsonErr("Not found", 404);

    // Check linked records
    const [quotes, jobs, invoices] = await Promise.all([
      prisma.quote.count({ where: { clientId } }),
      prisma.job.count({ where: { clientId } }),
      prisma.invoice.count({ where: { clientId } }),
    ]);

    if (quotes > 0 || jobs > 0 || invoices > 0) {
      return NextResponse.json({
        ok: false,
        error: "cannot_delete_client",
        message: "Cannot delete a client with existing quotes, jobs, or invoices. Delete related records first.",
        linked: { quotes, jobs, invoices },
      }, { status: 409 });
    }

    // No linked records — safe to hard delete (contacts + sites first, then client)
    await prisma.$transaction(async (tx: any) => {
      await tx.contact.deleteMany({ where: { clientId } });
      await tx.site.deleteMany({ where: { clientId } });
      await tx.auditEvent.deleteMany({ where: { entityType: "client", entityId: clientId } });
      await tx.client.delete({ where: { id: clientId } });
    });

    await repo.recordAuditEvent({
      entityType: "client",
      entityId: clientId,
      action: "client.deleted",
      actorRole: "admin",
      actor: authCtx.email,
      meta: { name: client.name, email: client.email },
    }).catch(() => {});

    return jsonOk({ deleted: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
    return jsonErr(e, status);
  }
});
