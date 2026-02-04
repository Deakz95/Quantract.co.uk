export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";
import { randomUUID } from "crypto";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  identifier: z.string().max(100).optional(),
  status: z.enum(["active", "retired"]).optional(),
});

/**
 * GET /api/admin/assets/[assetId]
 */
export async function GET(_req: Request, ctx: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await getRouteParams(ctx);
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, companyId: authCtx.companyId },
    });
    if (!asset) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true, data: asset });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[GET /api/admin/assets/[assetId]]", error);
    return NextResponse.json({ ok: false, error: "Failed to load asset" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/assets/[assetId]
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await getRouteParams(ctx);
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const existing = await prisma.asset.findFirst({
      where: { id: assetId, companyId: authCtx.companyId },
    });
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.asset.update({
      where: { id: assetId },
      data: parsed.data,
    });

    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        entityType: "asset",
        entityId: assetId,
        action: "asset.updated",
        actorRole: role,
        meta: parsed.data,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[PATCH /api/admin/assets/[assetId]]", error);
    return NextResponse.json({ ok: false, error: "Failed to update asset" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/assets/[assetId]
 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await getRouteParams(ctx);
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const existing = await prisma.asset.findFirst({
      where: { id: assetId, companyId: authCtx.companyId },
    });
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    // Soft-delete: retire instead of hard delete to preserve check history
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "retired" },
    });

    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        entityType: "asset",
        entityId: assetId,
        action: "asset.retired",
        actorRole: role,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[DELETE /api/admin/assets/[assetId]]", error);
    return NextResponse.json({ ok: false, error: "Failed to delete asset" }, { status: 500 });
  }
}
