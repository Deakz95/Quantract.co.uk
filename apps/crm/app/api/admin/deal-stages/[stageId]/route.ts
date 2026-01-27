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
  async function GET(_req: Request, ctx: { params: Promise<{ stageId: string }> }) {
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

      const { stageId } = await getRouteParams(ctx);

      const stage = await client.dealStage.findFirst({
        where: { id: stageId, companyId: authCtx.companyId },
        include: {
          _count: {
            select: { deals: true },
          },
        },
      });

      if (!stage) {
        return jsonErr("not_found", 404);
      }

      return jsonOk({ stage });
    } catch (e) {
      logError(e, { route: "/api/admin/deal-stages/[stageId]", action: "get" });
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);

export const PATCH = withRequestLogging(
  async function PATCH(req: Request, ctx: { params: Promise<{ stageId: string }> }) {
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

      const { stageId } = await getRouteParams(ctx);
      const body = (await req.json().catch(() => ({}))) as any;

      // Check stage exists and belongs to this company
      const existing = await client.dealStage.findFirst({
        where: { id: stageId, companyId: authCtx.companyId },
      });

      if (!existing) {
        return jsonErr("not_found", 404);
      }

      // Check for duplicate name if changing name
      if (body?.name && body.name !== existing.name) {
        const nameExists = await client.dealStage.findFirst({
          where: {
            companyId: authCtx.companyId,
            name: body.name,
            id: { not: stageId },
          },
        });
        if (nameExists) {
          return jsonErr("name_already_exists", 409);
        }
      }

      // Validate isWon and isLost are mutually exclusive
      const isWon = body?.isWon !== undefined ? Boolean(body.isWon) : existing.isWon;
      const isLost = body?.isLost !== undefined ? Boolean(body.isLost) : existing.isLost;

      if (isWon && isLost) {
        return jsonErr("stage_cannot_be_won_and_lost", 400);
      }

      const patch = pickDefined({
        name: body?.name,
        color: body?.color,
        sortOrder: body?.sortOrder != null ? Number(body.sortOrder) : undefined,
        probability: body?.probability != null ? Number(body.probability) : undefined,
        isWon: body?.isWon !== undefined ? Boolean(body.isWon) : undefined,
        isLost: body?.isLost !== undefined ? Boolean(body.isLost) : undefined,
      });

      const updated = await client.dealStage.update({
        where: { id: stageId },
        data: { ...patch, updatedAt: new Date() },
      });

      // Audit event
      await repo.recordAuditEvent({
        entityType: "deal_stage",
        entityId: stageId,
        action: "deal_stage.updated",
        actorRole: "admin",
        actor: authCtx.email,
        meta: { changes: patch },
      });

      return jsonOk({ stage: updated });
    } catch (e) {
      logError(e, { route: "/api/admin/deal-stages/[stageId]", action: "update" });
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
        return jsonErr("name_already_exists", 409);
      }
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);

export const DELETE = withRequestLogging(
  async function DELETE(_req: Request, ctx: { params: Promise<{ stageId: string }> }) {
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

      const { stageId } = await getRouteParams(ctx);

      // Get stage details before deletion for audit
      const stage = await client.dealStage.findFirst({
        where: { id: stageId, companyId: authCtx.companyId },
        include: {
          _count: {
            select: { deals: true },
          },
        },
      });

      if (!stage) {
        return jsonErr("not_found", 404);
      }

      // Check if stage has any deals - prevent deletion if it does
      if (stage._count.deals > 0) {
        return jsonErr("cannot_delete_stage_with_deals", 400);
      }

      await client.dealStage.delete({
        where: { id: stageId },
      });

      // Audit event
      await repo.recordAuditEvent({
        entityType: "deal_stage",
        entityId: stageId,
        action: "deal_stage.deleted",
        actorRole: "admin",
        actor: authCtx.email,
        meta: {
          name: stage.name,
          sortOrder: stage.sortOrder,
        },
      });

      return jsonOk({ deleted: true });
    } catch (e) {
      logError(e, { route: "/api/admin/deal-stages/[stageId]", action: "delete" });
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);
