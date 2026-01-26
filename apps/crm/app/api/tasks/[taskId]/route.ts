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

export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ taskId: string }> }) {
    try {
      await requireAuth();
      const companyId = await requireCompanyId();
      const { taskId } = await getRouteParams(ctx);

      const db = getPrisma();
      if (!db) {
        return jsonErr("Database not available", 503);
      }

      const task = await db.task.findFirst({
        where: { id: taskId, companyId },
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
          job: {
            select: { id: true, title: true },
          },
          client: {
            select: { id: true, name: true },
          },
          parentTask: {
            select: { id: true, title: true },
          },
          subtasks: {
            include: {
              assignee: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          comments: {
            include: {
              creator: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!task) return jsonErr("Task not found", 404);

      return jsonOk({ task });
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      return jsonErr(e, 500);
    }
  }
);

export const PATCH = withRequestLogging(
  async function PATCH(req: Request, ctx: { params: Promise<{ taskId: string }> }) {
    try {
      const authCtx = await requireAuth();
      const user = { id: authCtx.userId, email: authCtx.email, role: authCtx.role };
      const companyId = await requireCompanyId();
      const { taskId } = await getRouteParams(ctx);

      const db = getPrisma();
      if (!db) {
        return jsonErr("Database not available", 503);
      }

      const body = (await req.json().catch(() => ({}))) as {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        dueDate?: string | null;
        assigneeId?: string | null;
      };

      // Verify task exists and belongs to company
      const existing = await db.task.findFirst({
        where: { id: taskId, companyId },
      });

      if (!existing) return jsonErr("Task not found", 404);

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (body.title !== undefined) updateData.title = body.title.trim();
      if (body.description !== undefined) updateData.description = body.description?.trim() || null;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.dueDate !== undefined) {
        updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      }
      if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId || null;

      // Handle completion
      if (body.status === "done" && existing.status !== "done") {
        updateData.completedAt = new Date();
      } else if (body.status !== "done" && existing.status === "done") {
        updateData.completedAt = null;
      }

      const task = await db.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
          job: {
            select: { id: true, title: true },
          },
          client: {
            select: { id: true, name: true },
          },
          subtasks: {
            include: {
              assignee: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      // Create audit event
      await db.auditEvent.create({
        data: {
          id: crypto.randomUUID(),
          companyId,
          userId: user.id,
          action: "task.updated",
          entityType: "task",
          entityId: taskId,
          metadata: {
            changes: Object.keys(updateData),
            oldStatus: existing.status,
            newStatus: task.status,
          },
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
        },
      });

      return jsonOk({ task });
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      console.error("[PATCH /api/tasks/[taskId]] Error:", e);
      return jsonErr(e, 500);
    }
  }
);

export const DELETE = withRequestLogging(
  async function DELETE(_req: Request, ctx: { params: Promise<{ taskId: string }> }) {
    try {
      const authCtx = await requireAuth();
      const user = { id: authCtx.userId, email: authCtx.email, role: authCtx.role };
      const companyId = await requireCompanyId();
      const { taskId } = await getRouteParams(ctx);

      const db = getPrisma();
      if (!db) {
        return jsonErr("Database not available", 503);
      }

      // Verify task exists and belongs to company
      const existing = await db.task.findFirst({
        where: { id: taskId, companyId },
      });

      if (!existing) return jsonErr("Task not found", 404);

      // Delete task (cascade will handle subtasks and comments)
      await db.task.delete({
        where: { id: taskId },
      });

      // Create audit event
      await db.auditEvent.create({
        data: {
          id: crypto.randomUUID(),
          companyId,
          userId: user.id,
          action: "task.deleted",
          entityType: "task",
          entityId: taskId,
          metadata: {
            title: existing.title,
          },
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
        },
      });

      return jsonOk({ deleted: true });
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      return jsonErr(e, 500);
    }
  }
);
