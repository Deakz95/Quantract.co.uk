import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";

export async function GET() {
  try {
    const ctx = await requireRole("admin");
    if (!ctx?.companyId) {
      return NextResponse.json({ ok: true, data: [] });
    }
    
    const stages = await prisma.pipelineStage.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { sortOrder: "asc" }
    });
    
    return NextResponse.json({ ok: true, data: stages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/stages" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authCtx = await requireRole("admin");
    if (!authCtx?.companyId) {
      return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: "Internal error", message, route: "/api/admin/stages" },
      { status: 500 }
    );
  }
}
