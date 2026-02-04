export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { randomUUID } from "crypto";
import { z } from "zod";

const createSchema = z.object({
  templateId: z.string().optional(),
  assetId: z.string().optional(),
  title: z.string().min(1).max(200),
  dueAt: z.string().refine((s) => !isNaN(Date.parse(s)), { message: "Invalid date" }),
  engineerId: z.string().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(z.object({
    title: z.string().min(1).max(200),
    isRequired: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  })).min(1).max(100),
});

/**
 * GET /api/admin/scheduled-checks
 * List scheduled checks with filters.
 * Query params: status, engineerId, templateId, page, pageSize
 */
export async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const engineerId = searchParams.get("engineerId");
    const templateId = searchParams.get("templateId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));

    const where: Record<string, unknown> = { companyId: authCtx.companyId };
    if (status) where.status = status;
    if (engineerId) where.engineerId = engineerId;
    if (templateId) where.templateId = templateId;

    const [checks, total] = await Promise.all([
      prisma.scheduledCheck.findMany({
        where,
        orderBy: { dueAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          asset: { select: { id: true, type: true, name: true, identifier: true } },
        },
      }),
      prisma.scheduledCheck.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: checks,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[GET /api/admin/scheduled-checks]", error);
    return NextResponse.json({ ok: false, error: "Failed to load checks" }, { status: 500 });
  }
}

/**
 * POST /api/admin/scheduled-checks
 * Create a new scheduled check, optionally from a template.
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

    // If templateId provided, load template items
    let items = body.items;
    let templateId = body.templateId;
    let title = body.title;

    if (templateId && !items) {
      const template = await prisma.checklistTemplate.findFirst({
        where: { id: templateId, companyId: authCtx.companyId, isActive: true },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
      if (!template) {
        return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
      }
      title = title || template.title;
      items = template.items.map((i: any) => ({
        title: i.title,
        isRequired: i.isRequired,
        sortOrder: i.sortOrder,
      }));
    }

    const parsed = createSchema.safeParse({ ...body, title, items, templateId });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    // Validate assetId belongs to this company if provided
    if (parsed.data.assetId) {
      const asset = await prisma.asset.findFirst({
        where: { id: parsed.data.assetId, companyId: authCtx.companyId, status: "active" },
      });
      if (!asset) {
        return NextResponse.json({ ok: false, error: "Asset not found" }, { status: 404 });
      }
    }

    const checkId = randomUUID();
    const check = await prisma.scheduledCheck.create({
      data: {
        id: checkId,
        companyId: authCtx.companyId,
        templateId: parsed.data.templateId ?? null,
        assetId: parsed.data.assetId ?? null,
        title: parsed.data.title,
        status: "pending",
        dueAt: new Date(parsed.data.dueAt),
        engineerId: parsed.data.engineerId ?? null,
        notes: parsed.data.notes ?? null,
        items: {
          create: parsed.data.items.map((item, idx) => ({
            id: randomUUID(),
            title: item.title,
            isRequired: item.isRequired,
            sortOrder: item.sortOrder || idx,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        asset: { select: { id: true, type: true, name: true, identifier: true } },
      },
    });

    // Audit trail
    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        entityType: "scheduled_check",
        entityId: checkId,
        action: "scheduled_check.created",
        actorRole: role,
        meta: { title: parsed.data.title, dueAt: parsed.data.dueAt, templateId: parsed.data.templateId },
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, data: check }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[POST /api/admin/scheduled-checks]", error);
    return NextResponse.json({ ok: false, error: "Failed to create check" }, { status: 500 });
  }
}
