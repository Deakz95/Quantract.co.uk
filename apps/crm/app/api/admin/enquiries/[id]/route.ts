import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function pickDefined<T extends Record<string, any>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
      await requireRoles("admin");
      await requireCompanyId();
      const { id } = await getRouteParams(ctx);
      const enquiry = await repo.getEnquiryById(id);
      if (!enquiry) return jsonErr("Not found", 404);
      return jsonOk({ enquiry });
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      return jsonErr(e, 400);
    }
  }
);

export const PATCH = withRequestLogging(
  async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
      const authCtx = await requireRoles("admin");
      await requireCompanyId();
      const { id } = await getRouteParams(ctx);
      const body = (await req.json().catch(() => ({}))) as any;
      const patch = pickDefined({
        stageId: body?.stageId,
        ownerId: body?.ownerId,
        name: body?.name,
        email: body?.email,
        phone: body?.phone,
        notes: body?.notes,
        valueEstimate: body?.valueEstimate,
        quoteId: body?.quoteId,
      });
      const updated = await repo.updateEnquiry(id, patch as any);
      if (!updated) return jsonErr("Not found", 404);

      // Audit event for enquiry update
      await repo.recordAuditEvent({
        entityType: "enquiry",
        entityId: id,
        action: "enquiry.updated",
        actorRole: "admin",
        actor: authCtx.email,
        meta: { changes: patch },
      });

      return jsonOk({ enquiry: updated });
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      return jsonErr(e, 400);
    }
  }
);

export const DELETE = withRequestLogging(
  async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
      const authCtx = await requireRoles("admin");
      await requireCompanyId();
      const { id } = await getRouteParams(ctx);

      // Get enquiry details before deletion for audit
      const enquiry = await repo.getEnquiryById(id);

      const deleted = await repo.deleteEnquiry(id);

      // Audit event for enquiry deletion
      if (deleted && enquiry) {
        await repo.recordAuditEvent({
          entityType: "enquiry",
          entityId: id,
          action: "enquiry.deleted",
          actorRole: "admin",
          actor: authCtx.email,
          meta: {
            name: enquiry.name,
            email: enquiry.email,
          },
        });
      }

      return jsonOk({ deleted });
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      return jsonErr(e, 400);
    }
  }
);
