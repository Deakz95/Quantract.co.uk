import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const stages = await prisma.pipelineStage.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: { sortOrder: "asc" }
    });

    return NextResponse.json({ ok: true, data: stages || [] });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/stages", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/stages", action: "list" });
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

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = await req.json();

    // Get the highest sortOrder to append new stage at the end
    const lastStage = await prisma.pipelineStage.findFirst({
      where: { companyId: authCtx.companyId },
      orderBy: { sortOrder: "desc" }
    });

    const sortOrder = body.sortOrder ?? ((lastStage?.sortOrder ?? -1) + 1);

    const stage = await prisma.pipelineStage.create({
      data: {
        companyId: authCtx.companyId,
        name: body.name,
        sortOrder,
        color: body.color || null,
        isWon: body.isWon || false,
        isLost: body.isLost || false,
      }
    });

    // Audit event for stage creation
    await repo.recordAuditEvent({
      entityType: "stage",
      entityId: stage.id,
      action: "stage.created",
      actorRole: "admin",
      actor: authCtx.email,
      meta: {
        name: body.name,
        sortOrder,
        isWon: body.isWon || false,
        isLost: body.isLost || false,
      },
    });

    return NextResponse.json({ ok: true, data: stage });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/stages", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/stages", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
