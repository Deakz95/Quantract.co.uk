import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export const POST = withRequestLogging(async function POST(req: Request) {
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

    const body = (await req.json().catch(() => null)) as any;

    // Expect an array of { id: string, sortOrder: number }
    const stageOrders = body?.stages;

    if (!Array.isArray(stageOrders)) {
      return jsonErr("stages_array_required", 400);
    }

    // Validate the array format
    for (const item of stageOrders) {
      if (!item?.id || typeof item.id !== "string") {
        return jsonErr("invalid_stage_order_format", 400);
      }
      if (typeof item.sortOrder !== "number") {
        return jsonErr("invalid_stage_order_format", 400);
      }
    }

    // Verify all stages belong to this company
    const stageIds = stageOrders.map((s: any) => s.id);
    const existingStages = await client.dealStage.findMany({
      where: {
        id: { in: stageIds },
        companyId: authCtx.companyId,
      },
      select: { id: true },
    });

    const existingIds = new Set(existingStages.map((s: { id: string }) => s.id));
    for (const id of stageIds) {
      if (!existingIds.has(id)) {
        return jsonErr("invalid_stage_id", 400);
      }
    }

    // Update all stages in a transaction
    await client.$transaction(
      stageOrders.map((item: { id: string; sortOrder: number }) =>
        client.dealStage.update({
          where: { id: item.id },
          data: {
            sortOrder: item.sortOrder,
            updatedAt: new Date(),
          },
        })
      )
    );

    // Fetch updated stages
    const stages = await client.dealStage.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: { sortOrder: "asc" },
    });

    // Audit event
    await repo.recordAuditEvent({
      entityType: "deal_stage",
      entityId: authCtx.companyId,
      action: "deal_stage.reordered",
      actorRole: "admin",
      actor: authCtx.email,
      meta: {
        stageOrders: stageOrders.map((s: { id: string; sortOrder: number }) => ({ id: s.id, sortOrder: s.sortOrder })),
      },
    });

    return jsonOk({ stages });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/deal-stages/reorder", action: "reorder" });
      return jsonErr("database_error", 409);
    }
    logError(error, { route: "/api/admin/deal-stages/reorder", action: "reorder" });
    return jsonErr("reorder_failed", 500);
  }
});
