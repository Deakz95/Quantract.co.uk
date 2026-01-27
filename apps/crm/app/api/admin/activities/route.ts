import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import * as repo from "@/lib/server/repo";
import crypto from "node:crypto";

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

/**
 * GET /api/admin/activities
 * List activities with optional filters: contactId, dealId, clientId, jobId, type
 */
export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireRole("admin");
    if (!authCtx?.companyId) {
      return jsonOk({ activities: [] });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return jsonErr("Database not available", 500);
    }

    const url = new URL(req.url);
    const contactId = url.searchParams.get("contactId");
    const dealId = url.searchParams.get("dealId");
    const clientId = url.searchParams.get("clientId");
    const jobId = url.searchParams.get("jobId");
    const type = url.searchParams.get("type");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const where: Record<string, unknown> = {
      companyId: authCtx.companyId,
    };

    if (contactId) where.contactId = contactId;
    if (dealId) where.dealId = dealId;
    if (clientId) where.clientId = clientId;
    if (jobId) where.jobId = jobId;
    if (type && isValidActivityType(type)) where.type = type;

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, title: true } },
          client: { select: { id: true, name: true } },
          job: { select: { id: true, title: true } },
        },
        orderBy: { occurredAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.activity.count({ where }),
    ]);

    return jsonOk({
      activities: activities.map((a: typeof activities[number]) => ({
        id: a.id,
        type: a.type,
        subject: a.subject,
        description: a.description,
        occurredAt: a.occurredAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        metadata: a.metadata,
        creator: a.creator,
        contact: a.contact,
        deal: a.deal,
        client: a.client,
        job: a.job,
      })),
      total,
      limit,
      offset,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
    return jsonErr(e, status);
  }
});

/**
 * POST /api/admin/activities
 * Create a new activity
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireRole("admin");
    if (!authCtx?.companyId) {
      return jsonErr("No company context", 400);
    }

    const prisma = getPrisma();
    if (!prisma) {
      return jsonErr("Database not available", 500);
    }

    const body = await req.json().catch(() => ({}));

    // Validate required fields
    if (!body.type || !isValidActivityType(body.type)) {
      return jsonErr(`Invalid activity type. Must be one of: ${VALID_ACTIVITY_TYPES.join(", ")}`, 400);
    }

    if (!body.subject || typeof body.subject !== "string" || !body.subject.trim()) {
      return jsonErr("Subject is required", 400);
    }

    // At least one entity must be linked
    if (!body.contactId && !body.dealId && !body.clientId && !body.jobId) {
      return jsonErr("At least one of contactId, dealId, clientId, or jobId must be provided", 400);
    }

    // Find the user to use as createdBy
    const user = await prisma.user.findFirst({
      where: {
        companyId: authCtx.companyId,
        email: authCtx.email,
      },
      select: { id: true },
    });

    if (!user) {
      return jsonErr("User not found", 404);
    }

    const activity = await prisma.activity.create({
      data: {
        id: crypto.randomUUID(),
        companyId: authCtx.companyId,
        type: body.type,
        subject: body.subject.trim(),
        description: body.description?.trim() || null,
        contactId: body.contactId || null,
        dealId: body.dealId || null,
        clientId: body.clientId || null,
        jobId: body.jobId || null,
        createdBy: user.id,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
        metadata: body.metadata || null,
      },
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
      action: "activity.created",
      actorRole: "admin",
      actor: authCtx.email,
      meta: {
        type: activity.type,
        subject: activity.subject,
        contactId: activity.contactId,
        dealId: activity.dealId,
        clientId: activity.clientId,
        jobId: activity.jobId,
      },
    });

    return jsonOk(
      {
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
      },
      201
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
    return jsonErr(e, status);
  }
});
