import { NextResponse } from "next/server";
import { requireAuth, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import crypto from "crypto";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export const PATCH = withRequestLogging(
  async function PATCH(
    req: Request,
    ctx: { params: Promise<{ jobId: string; checklistId: string; itemId: string }> }
  ) {
    try {
      const authCtx = await requireAuth();
      const user = { id: authCtx.userId, email: authCtx.email, role: authCtx.role };
      const companyId = await requireCompanyId();
      const { jobId, checklistId, itemId } = await getRouteParams(ctx);

      const db = getPrisma();
      if (!db) {
        return jsonErr("Database not available", 503);
      }

      const body = (await req.json().catch(() => ({}))) as {
        status?: string;
        notes?: string;
      };

      // Verify job and checklist exist and belong to company
      const checklist = await db.jobChecklist.findFirst({
        where: {
          id: checklistId,
          jobId,
          companyId,
        },
        include: {
          items: true,
        },
      });

      if (!checklist) return jsonErr("Checklist not found", 404);

      const item = checklist.items.find((i: { id: string }) => i.id === itemId);
      if (!item) return jsonErr("Checklist item not found", 404);

      const isCompleting = body.status === "completed";
      const wasCompleted = item.status === "completed";

      // Get user name for audit trail
      const userData = await db.user.findUnique({
        where: { id: user.id },
        select: { name: true, email: true },
      });

      const completedByName = userData?.name || userData?.email || "Unknown";

      // Update item
      const updatedItem = await db.jobChecklistItem.update({
        where: { id: itemId },
        data: {
          status: body.status || item.status,
          notes: body.notes !== undefined ? body.notes : item.notes,
          completedAt: isCompleting ? new Date() : wasCompleted ? item.completedAt : null,
          completedBy: isCompleting ? user.id : wasCompleted ? item.completedBy : null,
          completedByName: isCompleting ? completedByName : wasCompleted ? item.completedByName : null,
        },
      });

      // Create audit event
      const action = isCompleting
        ? "checklist.item.completed"
        : wasCompleted && body.status === "pending"
        ? "checklist.item.uncompleted"
        : "checklist.item.updated";

      await db.auditEvent.create({
        data: {
          id: crypto.randomUUID(),
          companyId,
          userId: user.id,
          action,
          entityType: "job",
          entityId: jobId,
          metadata: {
            checklistId,
            checklistTitle: checklist.title,
            itemId,
            itemTitle: item.title,
            isRequired: item.isRequired,
            oldStatus: item.status,
            newStatus: updatedItem.status,
            notes: body.notes,
          },
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
        },
      });

      return jsonOk({ item: updatedItem });
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      console.error("[PATCH /api/jobs/[jobId]/checklists/[checklistId]/items/[itemId]] Error:", e);
      return jsonErr(e, 500);
    }
  }
);
