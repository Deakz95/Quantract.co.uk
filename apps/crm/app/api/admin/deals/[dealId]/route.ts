import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

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
  async function GET(_req: Request, ctx: { params: Promise<{ dealId: string }> }) {
    try {
      const authCtx = await getAuthContext();
      if (!authCtx) {
        return jsonErr("unauthenticated", 401);
      }

      if (authCtx.role !== "admin") {
        return jsonErr("forbidden", 403);
      }

      if (!authCtx.companyId) {
        return jsonErr("no_company", 401);
      }

      const client = getPrisma();
      if (!client) {
        return jsonErr("service_unavailable", 503);
      }

      const { dealId } = await getRouteParams(ctx);

      const deal = await client.deal.findFirst({
        where: { id: dealId, companyId: authCtx.companyId },
        include: {
          stage: { select: { id: true, name: true, color: true, probability: true, isWon: true, isLost: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, jobTitle: true } },
          client: { select: { id: true, name: true, email: true, phone: true } },
          owner: { select: { id: true, name: true, email: true } },
          activities: {
            select: { id: true, type: true, subject: true, description: true, occurredAt: true, createdBy: true },
            orderBy: { occurredAt: "desc" },
            take: 20,
          },
        },
      });

      if (!deal) {
        return jsonErr("not_found", 404);
      }

      return jsonOk({ deal });
    } catch (e) {
      logError(e, { route: "/api/admin/deals/[dealId]", action: "get" });
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);

export const PATCH = withRequestLogging(
  async function PATCH(req: Request, ctx: { params: Promise<{ dealId: string }> }) {
    try {
      const authCtx = await getAuthContext();
      if (!authCtx) {
        return jsonErr("unauthenticated", 401);
      }

      if (authCtx.role !== "admin") {
        return jsonErr("forbidden", 403);
      }

      if (!authCtx.companyId) {
        return jsonErr("no_company", 401);
      }

      const client = getPrisma();
      if (!client) {
        return jsonErr("service_unavailable", 503);
      }

      const { dealId } = await getRouteParams(ctx);
      const body = (await req.json().catch(() => ({}))) as any;

      // Check deal exists and belongs to this company
      const existing = await client.deal.findFirst({
        where: { id: dealId, companyId: authCtx.companyId },
        include: { stage: true },
      });

      if (!existing) {
        return jsonErr("not_found", 404);
      }

      // Verify stage if changing
      if (body?.stageId && body.stageId !== existing.stageId) {
        const stage = await client.dealStage.findFirst({
          where: { id: body.stageId, companyId: authCtx.companyId },
        });
        if (!stage) {
          return jsonErr("invalid_stage", 400);
        }
      }

      // Verify contact if changing
      if (body?.contactId !== undefined && body.contactId !== existing.contactId) {
        if (body.contactId) {
          const contact = await client.contact.findFirst({
            where: { id: body.contactId, companyId: authCtx.companyId },
          });
          if (!contact) {
            return jsonErr("invalid_contact", 400);
          }
        }
      }

      // Verify client if changing
      if (body?.clientId !== undefined && body.clientId !== existing.clientId) {
        if (body.clientId) {
          const clientRecord = await client.client.findFirst({
            where: { id: body.clientId, companyId: authCtx.companyId },
          });
          if (!clientRecord) {
            return jsonErr("invalid_client", 400);
          }
        }
      }

      // Verify owner if changing
      if (body?.ownerId !== undefined && body.ownerId !== existing.ownerId) {
        if (body.ownerId) {
          const owner = await client.user.findFirst({
            where: { id: body.ownerId, companyId: authCtx.companyId },
          });
          if (!owner) {
            return jsonErr("invalid_owner", 400);
          }
        }
      }

      const patch = pickDefined({
        title: body?.title,
        stageId: body?.stageId,
        contactId: body?.contactId,
        clientId: body?.clientId,
        ownerId: body?.ownerId,
        value: body?.value != null ? Number(body.value) : undefined,
        probability: body?.probability != null ? Number(body.probability) : undefined,
        expectedCloseDate: body?.expectedCloseDate !== undefined
          ? (body.expectedCloseDate ? new Date(body.expectedCloseDate) : null)
          : undefined,
        closedAt: body?.closedAt !== undefined
          ? (body.closedAt ? new Date(body.closedAt) : null)
          : undefined,
        lostReason: body?.lostReason,
        notes: body?.notes,
        source: body?.source,
      });

      const updated = await client.deal.update({
        where: { id: dealId },
        data: { ...patch, updatedAt: new Date() },
        include: {
          stage: { select: { id: true, name: true, color: true, probability: true, isWon: true, isLost: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          client: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
        },
      });

      // Audit event
      await repo.recordAuditEvent({
        entityType: "deal",
        entityId: dealId,
        action: "deal.updated",
        actorRole: "admin",
        actor: authCtx.email,
        meta: { changes: patch },
      });

      return jsonOk({ deal: updated });
    } catch (e) {
      logError(e, { route: "/api/admin/deals/[dealId]", action: "update" });
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);

export const DELETE = withRequestLogging(
  async function DELETE(_req: Request, ctx: { params: Promise<{ dealId: string }> }) {
    try {
      const authCtx = await getAuthContext();
      if (!authCtx) {
        return jsonErr("unauthenticated", 401);
      }

      if (authCtx.role !== "admin") {
        return jsonErr("forbidden", 403);
      }

      if (!authCtx.companyId) {
        return jsonErr("no_company", 401);
      }

      const client = getPrisma();
      if (!client) {
        return jsonErr("service_unavailable", 503);
      }

      const { dealId } = await getRouteParams(ctx);

      // Get deal details before deletion for audit
      const deal = await client.deal.findFirst({
        where: { id: dealId, companyId: authCtx.companyId },
      });

      if (!deal) {
        return jsonErr("not_found", 404);
      }

      // Delete associated activities first
      await client.activity.deleteMany({
        where: { dealId, companyId: authCtx.companyId },
      });

      await client.deal.delete({
        where: { id: dealId },
      });

      // Audit event
      await repo.recordAuditEvent({
        entityType: "deal",
        entityId: dealId,
        action: "deal.deleted",
        actorRole: "admin",
        actor: authCtx.email,
        meta: {
          title: deal.title,
          value: deal.value,
          stageId: deal.stageId,
        },
      });

      return jsonOk({ deleted: true });
    } catch (e) {
      logError(e, { route: "/api/admin/deals/[dealId]", action: "delete" });
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);
