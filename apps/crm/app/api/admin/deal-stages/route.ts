import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    await repo.ensureDefaultDealStages().catch(() => null);

    const stages = await client.dealStage.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ ok: true, stages: stages || [] });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/deal-stages", action: "list" });

    // Check for missing table errors (migration not applied)
    const errMsg = error instanceof Error ? error.message.toLowerCase() : "";
    if (errMsg.includes("does not exist") || errMsg.includes("table") || errMsg.includes("relation")) {
      return NextResponse.json({ ok: false, error: "Database setup in progress. Please try again later.", stages: [] }, { status: 503 });
    }

    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as any;
    const name = String(body?.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "name_required" },
        { status: 400 }
      );
    }

    // Check for duplicate name within company
    const existing = await client.dealStage.findFirst({
      where: { companyId: authCtx.companyId, name },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "name_already_exists" },
        { status: 409 }
      );
    }

    // Get the highest sortOrder to append new stage at the end
    const lastStage = await client.dealStage.findFirst({
      where: { companyId: authCtx.companyId },
      orderBy: { sortOrder: "desc" },
    });

    const nextSortOrder = (lastStage?.sortOrder ?? -1) + 1;

    // Validate isWon and isLost are mutually exclusive
    const isWon = Boolean(body?.isWon);
    const isLost = Boolean(body?.isLost);

    if (isWon && isLost) {
      return NextResponse.json(
        { ok: false, error: "stage_cannot_be_won_and_lost" },
        { status: 400 }
      );
    }

    const created = await client.dealStage.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        name,
        color: body?.color ? String(body.color).trim() : null,
        sortOrder: body?.sortOrder != null ? Number(body.sortOrder) : nextSortOrder,
        probability: body?.probability != null ? Number(body.probability) : null,
        isWon,
        isLost,
        updatedAt: new Date(),
      },
    });

    // Audit event
    await repo.recordAuditEvent({
      entityType: "deal_stage",
      entityId: created.id,
      action: "deal_stage.created",
      actorRole: "admin",
      actor: authCtx.email,
      meta: { name, sortOrder: created.sortOrder, isWon, isLost },
    });

    return NextResponse.json({ ok: true, stage: created });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/deal-stages", action: "create" });
      if (error.code === "P2002") {
        return NextResponse.json({ ok: false, error: "name_already_exists" }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/deal-stages", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
