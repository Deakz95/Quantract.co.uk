export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";
import { randomUUID } from "crypto";

/**
 * GET /api/tools/outputs/[id]
 * Get a single saved tool output.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { id } = await getRouteParams(ctx);

    const output = await prisma.toolOutput.findFirst({
      where: { id, companyId: authCtx.companyId },
    });

    if (!output) {
      return NextResponse.json({ ok: false, error: "Output not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: output });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "forbidden" }, { status: error.status });
    }
    console.error("[GET /api/tools/outputs/[id]]", error);
    return NextResponse.json({ ok: false, error: "Failed to load output" }, { status: 500 });
  }
}

/**
 * DELETE /api/tools/outputs/[id]
 * Delete a saved tool output.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { id } = await getRouteParams(ctx);

    const output = await prisma.toolOutput.findFirst({
      where: { id, companyId: authCtx.companyId },
      select: { id: true, toolSlug: true, name: true },
    });

    if (!output) {
      return NextResponse.json({ ok: false, error: "Output not found" }, { status: 404 });
    }

    await prisma.toolOutput.delete({ where: { id } });

    // Audit trail
    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        entityType: "tool_output",
        entityId: id,
        action: "tool_output.deleted",
        actorRole: "admin",
        meta: { toolSlug: output.toolSlug, name: output.name },
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "forbidden" }, { status: error.status });
    }
    console.error("[DELETE /api/tools/outputs/[id]]", error);
    return NextResponse.json({ ok: false, error: "Failed to delete output" }, { status: 500 });
  }
}
