export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { randomUUID } from "crypto";
import { z } from "zod";
import { renderCheckPdf } from "@/lib/server/pdf";
import { createDocument } from "@/lib/server/documents";
import { rateLimitEngineerWrite, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

const completeSchema = z.object({
  checkId: z.string().min(1),
  idempotencyKey: z.string().min(1).max(200).optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    status: z.enum(["completed", "na", "pending"]),
    notes: z.string().max(1000).optional(),
  })).min(1),
  notes: z.string().max(2000).optional(),
});

/**
 * GET /api/engineer/checks
 * List pending checks assigned to the authenticated engineer.
 */
export async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "engineer" && role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    // Find engineer record for this user
    const engineer = await prisma.engineer.findFirst({
      where: {
        companyId: authCtx.companyId,
        OR: [
          { email: authCtx.email },
          { users: { some: { id: authCtx.userId } } },
        ],
      },
    });
    if (!engineer) {
      return NextResponse.json({ ok: false, error: "Engineer not found" }, { status: 404 });
    }

    const checks = await prisma.scheduledCheck.findMany({
      where: {
        companyId: authCtx.companyId,
        engineerId: engineer.id,
      },
      orderBy: { dueAt: "asc" },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        asset: { select: { id: true, type: true, name: true, identifier: true } },
      },
    });

    return NextResponse.json({ ok: true, data: checks });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[GET /api/engineer/checks]", error);
    return NextResponse.json({ ok: false, error: "Failed to load checks" }, { status: 500 });
  }
}

/**
 * POST /api/engineer/checks
 * Submit a completed check with item statuses.
 * Generates PDF and stores as Document.
 * Supports idempotency key to prevent duplicate submissions from offline sync.
 */
export async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "engineer" && role !== "admin") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Rate limit by authenticated user
    const rl = rateLimitEngineerWrite(authCtx.email);
    if (!rl.ok) return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });

    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    // Idempotency check
    if (parsed.data.idempotencyKey) {
      const existing = await prisma.scheduledCheck.findFirst({
        where: {
          companyId: authCtx.companyId,
          idempotencyKey: parsed.data.idempotencyKey,
        },
      });
      if (existing) {
        return NextResponse.json({ ok: true, data: existing }, { status: 200 });
      }
    }

    // Load check with items and asset
    const check = await prisma.scheduledCheck.findFirst({
      where: {
        id: parsed.data.checkId,
        companyId: authCtx.companyId,
      },
      include: {
        items: true,
        asset: { select: { id: true, type: true, name: true, identifier: true } },
      },
    });

    if (!check) {
      return NextResponse.json({ ok: false, error: "Check not found" }, { status: 404 });
    }

    if (check.status === "completed") {
      return NextResponse.json({ ok: true, data: check }, { status: 200 });
    }

    // Update items
    for (const itemUpdate of parsed.data.items) {
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

    // Mark check as completed
    const completedAt = new Date();
    const checkUpdateData: Record<string, unknown> = {
      status: "completed",
      completedAt,
      completedById: authCtx.userId,
      notes: parsed.data.notes ?? check.notes,
    };
    if (parsed.data.idempotencyKey) {
      checkUpdateData.idempotencyKey = parsed.data.idempotencyKey;
    }

    await prisma.scheduledCheck.update({
      where: { id: check.id },
      data: checkUpdateData,
    });

    // Generate PDF
    let documentId: string | null = null;
    try {
      const finalItems = await prisma.scheduledCheckItem.findMany({
        where: { checkId: check.id },
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
        notes: parsed.data.notes ?? check.notes ?? null,
        completedAt: completedAt.toISOString(),
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
      documentId = doc.id;
      await prisma.scheduledCheck.update({
        where: { id: check.id },
        data: { documentId: doc.id },
      });
    } catch (pdfErr) {
      console.error("[engineer/checks] PDF generation failed:", pdfErr);
    }

    // Audit trail
    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        entityType: "scheduled_check",
        entityId: check.id,
        action: "scheduled_check.completed",
        actorRole: role,
        meta: { title: check.title, completedById: authCtx.userId, documentId },
      },
    }).catch(() => {});

    const result = await prisma.scheduledCheck.findFirst({
      where: { id: check.id },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        asset: { select: { id: true, type: true, name: true, identifier: true } },
      },
    });

    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "Forbidden" }, { status: error.status });
    }
    console.error("[POST /api/engineer/checks]", error);
    return NextResponse.json({ ok: false, error: "Failed to complete check" }, { status: 500 });
  }
}
