import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import * as repo from "@/lib/server/repo";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

const VALID_ACTIVITY_TYPES = ["NOTE", "CALL", "EMAIL", "MEETING", "TASK", "STAGE_CHANGE"] as const;
type ActivityType = (typeof VALID_ACTIVITY_TYPES)[number];

function isValidActivityType(type: string): type is ActivityType {
  return VALID_ACTIVITY_TYPES.includes(type as ActivityType);
}

function pickDefined<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * GET /api/admin/activities/[activityId]
 * Get a single activity by ID
 */
export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ activityId: string }> }) {
    try {
      const authCtx = await requireRole("admin");
      if (!authCtx?.companyId) {
        return jsonErr("No company context", 400);
      }

      const prisma = getPrisma();
      if (!prisma) {
        return jsonErr("Database not available", 500);
      }

      const { activityId } = await getRouteParams(ctx);

      const activity = await prisma.activity.findFirst({
        where: {
          id: activityId,
          companyId: authCtx.companyId,
        },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, title: true } },
          client: { select: { id: true, name: true } },
          job: { select: { id: true, title: true } },
        },
      });

      if (!activity) {
        return jsonErr("Activity not found", 404);
      }

      return jsonOk({
        activity: {
          id: activity.id,
          type: activity.type,
          subject: activity.subject,
          description: activity.description,
          occurredAt: activity.occurredAt.toISOString(),
          createdAt: activity.createdAt.toISOString(),
          updatedAt: activity.updatedAt.toISOString(),
          metadata: activity.metadata,
          creator: activity.creator,
          contact: activity.contact,
          deal: activity.deal,
          client: activity.client,
          job: activity.job,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);

/**
 * PATCH /api/admin/activities/[activityId]
 * Update an activity
 */
export const PATCH = withRequestLogging(
  async function PATCH(req: Request, ctx: { params: Promise<{ activityId: string }> }) {
    try {
      const authCtx = await requireRole("admin");
      if (!authCtx?.companyId) {
        return jsonErr("No company context", 400);
      }

      const prisma = getPrisma();
      if (!prisma) {
        return jsonErr("Database not available", 500);
      }

      const { activityId } = await getRouteParams(ctx);
      const body = await req.json().catch(() => ({}));

      // Verify activity exists and belongs to company
      const existing = await prisma.activity.findFirst({
        where: {
          id: activityId,
          companyId: authCtx.companyId,
        },
      });

      if (!existing) {
        return jsonErr("Activity not found", 404);
      }

      // Validate type if provided
      if (body.type !== undefined && !isValidActivityType(body.type)) {
        return jsonErr(`Invalid activity type. Must be one of: ${VALID_ACTIVITY_TYPES.join(", ")}`, 400);
      }

      // Validate subject if provided
      if (body.subject !== undefined && (typeof body.subject !== "string" || !body.subject.trim())) {
        return jsonErr("Subject cannot be empty", 400);
      }

      const patch = pickDefined({
        type: body.type,
        subject: body.subject?.trim(),
        description: body.description !== undefined ? (body.description?.trim() || null) : undefined,
        contactId: body.contactId !== undefined ? (body.contactId || null) : undefined,
        dealId: body.dealId !== undefined ? (body.dealId || null) : undefined,
        clientId: body.clientId !== undefined ? (body.clientId || null) : undefined,
        jobId: body.jobId !== undefined ? (body.jobId || null) : undefined,
        occurredAt: body.occurredAt !== undefined ? new Date(body.occurredAt) : undefined,
        metadata: body.metadata !== undefined ? body.metadata : undefined,
      });

      const activity = await prisma.activity.update({
        where: { id: activityId },
        data: patch,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, title: true } },
          client: { select: { id: true, name: true } },
          job: { select: { id: true, title: true } },
        },
      });

      // Record audit event
      await repo.recordAuditEvent({
        entityType: "activity",
        entityId: activity.id,
        action: "activity.updated",
        actorRole: "admin",
        actor: authCtx.email,
        meta: { changes: patch },
      });

      return jsonOk({
        activity: {
          id: activity.id,
          type: activity.type,
          subject: activity.subject,
          description: activity.description,
          occurredAt: activity.occurredAt.toISOString(),
          createdAt: activity.createdAt.toISOString(),
          updatedAt: activity.updatedAt.toISOString(),
          metadata: activity.metadata,
          creator: activity.creator,
          contact: activity.contact,
          deal: activity.deal,
          client: activity.client,
          job: activity.job,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);

/**
 * DELETE /api/admin/activities/[activityId]
 * Delete an activity
 */
export const DELETE = withRequestLogging(
  async function DELETE(_req: Request, ctx: { params: Promise<{ activityId: string }> }) {
    try {
      const authCtx = await requireRole("admin");
      if (!authCtx?.companyId) {
        return jsonErr("No company context", 400);
      }

      const prisma = getPrisma();
      if (!prisma) {
        return jsonErr("Database not available", 500);
      }

      const { activityId } = await getRouteParams(ctx);

      // Verify activity exists and belongs to company
      const existing = await prisma.activity.findFirst({
        where: {
          id: activityId,
          companyId: authCtx.companyId,
        },
      });

      if (!existing) {
        return jsonErr("Activity not found", 404);
      }

      await prisma.activity.delete({
        where: { id: activityId },
      });

      // Record audit event
      await repo.recordAuditEvent({
        entityType: "activity",
        entityId: activityId,
        action: "activity.deleted",
        actorRole: "admin",
        actor: authCtx.email,
        meta: {
          type: existing.type,
          subject: existing.subject,
        },
      });

      return jsonOk({ deleted: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);
