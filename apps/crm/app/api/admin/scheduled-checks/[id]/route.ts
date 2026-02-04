export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";
import { randomUUID } from "crypto";
import { renderCheckPdf } from "@/lib/server/pdf";
import { createDocument } from "@/lib/server/documents";

/**
 * GET /api/admin/scheduled-checks/[id]
 * Get a single scheduled check with items.
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

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { id } = await getRouteParams(ctx);

    const check = await prisma.scheduledCheck.findFirst({
      where: { id, companyId: authCtx.companyId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        asset: { select: { id: true, type: true, name: true, identifier: true } },
      },
    });

    if (!check) {
      return NextResponse.json({ ok: false, error: "Check not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: check });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[GET /api/admin/scheduled-checks/[id]]", error);
    return NextResponse.json({ ok: false, error: "Failed to load check" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/scheduled-checks/[id]
 * Update a scheduled check — complete items, add notes, mark as completed.
 * Body: { items?: [{ id, status, notes? }], notes?, status? }
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { id } = await getRouteParams(ctx);
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });

    const check = await prisma.scheduledCheck.findFirst({
      where: { id, companyId: authCtx.companyId },
      include: {
        items: true,
        asset: { select: { id: true, type: true, name: true, identifier: true } },
      },
    });
    if (!check) {
      return NextResponse.json({ ok: false, error: "Check not found" }, { status: 404 });
    }

    // Update individual items
    if (Array.isArray(body.items)) {
      for (const itemUpdate of body.items) {
        if (!itemUpdate.id || !itemUpdate.status) continue;
        // Verify item belongs to this check
        const existing = check.items.find((i: any) => i.id === itemUpdate.id);
        if (!existing) continue;

        await prisma.scheduledCheckItem.update({
          where: { id: itemUpdate.id },
          data: {
            status: itemUpdate.status,
            completedAt: itemUpdate.status === "completed" ? new Date() : null,
            completedBy: itemUpdate.status === "completed" ? authCtx.userId : null,
            notes: itemUpdate.notes ?? existing.notes,
          },
        });
      }
    }

    // Update check-level fields
    const checkUpdate: Record<string, unknown> = {};
    if (body.notes !== undefined) checkUpdate.notes = body.notes;

    // Auto-detect completion: if all required items are completed
    const updatedItems = await prisma.scheduledCheckItem.findMany({
      where: { checkId: id },
    });
    const allRequiredDone = updatedItems
      .filter((i: any) => i.isRequired)
      .every((i: any) => i.status === "completed" || i.status === "na");

    if (body.status === "completed" || (allRequiredDone && updatedItems.length > 0 && check.status === "pending")) {
      checkUpdate.status = "completed";
      checkUpdate.completedAt = new Date();
      checkUpdate.completedById = authCtx.userId;
    }

    if (Object.keys(checkUpdate).length > 0) {
      await prisma.scheduledCheck.update({
        where: { id },
        data: checkUpdate,
      });
    }

    // Audit trail on completion
    if (checkUpdate.status === "completed") {
      await prisma.auditEvent.create({
        data: {
          id: randomUUID(),
          companyId: authCtx.companyId,
          entityType: "scheduled_check",
          entityId: id,
          action: "scheduled_check.completed",
          actorRole: role,
          meta: { title: check.title, completedById: authCtx.userId },
        },
      }).catch(() => {});

      // Generate PDF and store as Document
      try {
        const finalItems = await prisma.scheduledCheckItem.findMany({
          where: { checkId: id },
          orderBy: { sortOrder: "asc" },
        });
        const pdfBytes = await renderCheckPdf({
          title: check.title,
          asset: (check as any).asset ?? null,
          items: finalItems.map((i: any) => ({
            title: i.title,
            isRequired: i.isRequired,
            status: i.status,
            notes: i.notes,
            completedBy: i.completedBy,
            completedAt: i.completedAt?.toISOString() ?? null,
          })),
          notes: body.notes ?? check.notes ?? null,
          completedAt: new Date().toISOString(),
        });
        const doc = await createDocument({
          companyId: authCtx.companyId,
          type: "check_pdf",
          mimeType: "application/pdf",
          bytes: pdfBytes,
          originalFilename: `check-${check.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
          createdByUserId: authCtx.userId,
          skipStorageCap: true,
        });
        await prisma.scheduledCheck.update({
          where: { id },
          data: { documentId: doc.id },
        });
      } catch (pdfErr) {
        console.error("[scheduled-check] PDF generation failed:", pdfErr);
        // Non-fatal: check is still completed, PDF can be regenerated
      }
    }

    const result = await prisma.scheduledCheck.findFirst({
      where: { id, companyId: authCtx.companyId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        asset: { select: { id: true, type: true, name: true, identifier: true } },
      },
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[PATCH /api/admin/scheduled-checks/[id]]", error);
    return NextResponse.json({ ok: false, error: "Failed to update check" }, { status: 500 });
  }
}
