import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * GET /api/admin/rams/[id]
 * Get a single RAMS / Safety Assessment document.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await getRouteParams(ctx);
    const prisma = getPrisma();

    const document = await prisma.ramsDocument.findFirst({
      where: { id, companyId: authCtx.companyId },
    });

    if (!document) {
      return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: document });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "Forbidden" }, { status: err.status });
    }
    console.error("[GET /api/admin/rams/[id]]", error);
    return NextResponse.json({ ok: false, error: "Failed to load document" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/rams/[id]
 * Update a draft RAMS / Safety Assessment document.
 * Only draft documents can be edited.
 */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await getRouteParams(ctx);
    const prisma = getPrisma();

    const existing = await prisma.ramsDocument.findFirst({
      where: { id, companyId: authCtx.companyId },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { ok: false, error: "Only draft documents can be edited" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
    }

    // Build update payload — only include fields that were provided
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) {
        return NextResponse.json({ ok: false, error: "title cannot be empty" }, { status: 400 });
      }
      update.title = title;
    }

    if (body.contentJson !== undefined) {
      if (body.contentJson !== null && typeof body.contentJson !== "object") {
        return NextResponse.json(
          { ok: false, error: "contentJson must be an object" },
          { status: 400 },
        );
      }
      update.contentJson = body.contentJson ?? {};
    }

    if (body.preparedBy !== undefined) update.preparedBy = body.preparedBy ? String(body.preparedBy) : null;
    if (body.reviewedBy !== undefined) update.reviewedBy = body.reviewedBy ? String(body.reviewedBy) : null;
    if (body.jobId !== undefined) {
      if (body.jobId) {
        const job = await prisma.job.findFirst({
          where: { id: String(body.jobId), companyId: authCtx.companyId },
          select: { id: true },
        });
        if (!job) {
          return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
        }
        update.jobId = job.id;
      } else {
        update.jobId = null;
      }
    }
    if (body.clientId !== undefined) {
      if (body.clientId) {
        const client = await prisma.client.findFirst({
          where: { id: String(body.clientId), companyId: authCtx.companyId },
          select: { id: true },
        });
        if (!client) {
          return NextResponse.json({ ok: false, error: "Client not found" }, { status: 404 });
        }
        update.clientId = client.id;
      } else {
        update.clientId = null;
      }
    }

    const result = await prisma.ramsDocument.updateMany({
      where: { id, companyId: authCtx.companyId },
      data: update,
    });

    if (result.count !== 1) {
      return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
    }

    // Audit trail
    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        entityType: "rams",
        entityId: id,
        action: "rams.updated",
        actorRole: role,
        meta: { updatedFields: Object.keys(update).filter((k) => k !== "updatedAt") },
      },
    }).catch(() => {});

    const document = await prisma.ramsDocument.findUnique({ where: { id } });
    return NextResponse.json({ ok: true, data: document });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "Forbidden" }, { status: err.status });
    }
    console.error("[PUT /api/admin/rams/[id]]", error);
    return NextResponse.json({ ok: false, error: "Failed to update document" }, { status: 500 });
  }
}
