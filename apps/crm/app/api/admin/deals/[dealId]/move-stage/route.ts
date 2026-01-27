import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export const POST = withRequestLogging(
  async function POST(req: Request, ctx: { params: Promise<{ dealId: string }> }) {
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

      const toStageId = String(body?.toStageId ?? "").trim();

      if (!toStageId) {
        return jsonErr("to_stage_id_required", 400);
      }

      // Get existing deal
      const deal = await client.deal.findFirst({
        where: { id: dealId, companyId: authCtx.companyId },
        include: { stage: true },
      });

      if (!deal) {
        return jsonErr("not_found", 404);
      }

      // Verify new stage exists and belongs to this company
      const toStage = await client.dealStage.findFirst({
        where: { id: toStageId, companyId: authCtx.companyId },
      });

      if (!toStage) {
        return jsonErr("invalid_stage", 400);
      }

      // Check if actually moving to a different stage
      if (deal.stageId === toStageId) {
        // No actual stage change, just return success
        const updatedDeal = await client.deal.findFirst({
          where: { id: dealId },
          include: {
            stage: { select: { id: true, name: true, color: true, probability: true, isWon: true, isLost: true } },
            contact: { select: { id: true, firstName: true, lastName: true, email: true } },
            client: { select: { id: true, name: true, email: true } },
            owner: { select: { id: true, name: true, email: true } },
          },
        });
        return jsonOk({ deal: updatedDeal });
      }

      const fromStage = deal.stage;

      // Update deal with new stage
      const updateData: any = {
        stageId: toStageId,
        updatedAt: new Date(),
      };

      // If moving to a won stage, set closedAt
      if (toStage.isWon && !deal.closedAt) {
        updateData.closedAt = new Date();
      }

      // If moving to a lost stage, set closedAt (but keep any existing lostReason)
      if (toStage.isLost && !deal.closedAt) {
        updateData.closedAt = new Date();
      }

      // If moving away from won/lost stage, clear closedAt
      if (!toStage.isWon && !toStage.isLost && deal.closedAt) {
        updateData.closedAt = null;
        updateData.lostReason = null;
      }

      // Update probability if stage has a default probability
      if (toStage.probability != null) {
        updateData.probability = toStage.probability;
      }

      const updated = await client.deal.update({
        where: { id: dealId },
        data: updateData,
        include: {
          stage: { select: { id: true, name: true, color: true, probability: true, isWon: true, isLost: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          client: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
        },
      });

      // Create Activity record for stage change
      await client.activity.create({
        data: {
          id: randomUUID(),
          companyId: authCtx.companyId,
          type: "STAGE_CHANGE",
          subject: `Moved from "${fromStage.name}" to "${toStage.name}"`,
          description: null,
          dealId: dealId,
          contactId: deal.contactId,
          clientId: deal.clientId,
          createdBy: authCtx.userId,
          occurredAt: new Date(),
          metadata: {
            fromStageId: fromStage.id,
            fromStageName: fromStage.name,
            toStageId: toStage.id,
            toStageName: toStage.name,
          },
          updatedAt: new Date(),
        },
      });

      // Audit event
      await repo.recordAuditEvent({
        entityType: "deal",
        entityId: dealId,
        action: "deal.stage_changed",
        actorRole: "admin",
        actor: authCtx.email,
        meta: {
          fromStageId: fromStage.id,
          fromStageName: fromStage.name,
          toStageId: toStage.id,
          toStageName: toStage.name,
          title: deal.title,
        },
      });

      return jsonOk({ deal: updated });
    } catch (e) {
      logError(e, { route: "/api/admin/deals/[dealId]/move-stage", action: "move" });
      if (e instanceof PrismaClientKnownRequestError) {
        return jsonErr("database_error", 409);
      }
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);
