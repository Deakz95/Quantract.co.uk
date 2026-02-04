export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { randomUUID } from "crypto";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["van", "ladder", "scaffold"]),
  name: z.string().min(1).max(200),
  identifier: z.string().max(100).optional(),
});

/**
 * GET /api/admin/assets
 * List assets with optional type/status filter.
 */
export async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status") || "active";

    const where: Record<string, unknown> = { companyId: authCtx.companyId };
    if (type) where.type = type;
    if (status) where.status = status;

    const assets = await prisma.asset.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ok: true, data: assets });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[GET /api/admin/assets]", error);
    return NextResponse.json({ ok: false, error: "Failed to load assets" }, { status: 500 });
  }
}

/**
 * POST /api/admin/assets
 * Create a new asset.
 */
export async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const asset = await prisma.asset.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        type: parsed.data.type,
        name: parsed.data.name,
        identifier: parsed.data.identifier ?? null,
      },
    });

    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        entityType: "asset",
        entityId: asset.id,
        action: "asset.created",
        actorRole: role,
        meta: { type: parsed.data.type, name: parsed.data.name },
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, data: asset }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[POST /api/admin/assets]", error);
    return NextResponse.json({ ok: false, error: "Failed to create asset" }, { status: 500 });
  }
}
