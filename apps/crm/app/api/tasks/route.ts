import { NextResponse } from "next/server";
import { requireAuth, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import crypto from "crypto";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const ctx = await requireAuth();
    const user = { id: ctx.userId, email: ctx.email, role: ctx.role };
    const companyId = await requireCompanyId();

    const db = getPrisma();
    if (!db) {
      return jsonErr("Database not available", 503);
    }

    const url = new URL(req.url);
    const view = url.searchParams.get("view") || "all";
    const jobId = url.searchParams.get("jobId");
    const clientId = url.searchParams.get("clientId");

    let where: any = { companyId };

    // Filter based on view
    if (view === "my") {
      where.assigneeId = user.id;
    } else if (view === "job" && jobId) {
      where.jobId = jobId;
    } else if (view === "client" && clientId) {
      where.clientId = clientId;
    } else if (view === "internal") {
      where.AND = [
        { jobId: null },
        { clientId: null },
      ];
    }

    // Only show parent tasks (subtasks included in parent)
    where.parentTaskId = null;

    const tasks = await db.task.findMany({
      where,
      include: {
        Assignee: {
          select: { id: true, name: true, email: true },
        },
        Creator: {
          select: { id: true, name: true, email: true },
        },
        Job: {
          select: { id: true, title: true },
        },
        Client: {
          select: { id: true, name: true },
        },
        Subtasks: {
          include: {
            Assignee: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        Comments: {
          include: {
            Creator: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: [
        { status: "asc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return jsonOk({ tasks });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    return jsonErr(e, 500);
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const ctx = await requireAuth();
    const user = { id: ctx.userId, email: ctx.email, role: ctx.role };
    const companyId = await requireCompanyId();

    const db = getPrisma();
    if (!db) {
      return jsonErr("Database not available", 503);
    }

    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
      assigneeId?: string;
      jobId?: string;
      clientId?: string;
      parentTaskId?: string;
    };

    if (!body.title?.trim()) {
      return jsonErr("Title is required", 400);
    }

    // Validate status
    const validStatuses = ["todo", "in_progress", "done", "cancelled"];
    const status = body.status && validStatuses.includes(body.status) ? body.status : "todo";

    // Validate priority
    const validPriorities = ["low", "medium", "high", "urgent"];
    const priority = body.priority && validPriorities.includes(body.priority) ? body.priority : "medium";

    // Parse mentions from description
    const description = body.description?.trim() || null;
    const mentionedUserIds = description ? extractMentions(description) : [];

    const task = await db.task.create({
      data: {
        id: crypto.randomUUID(),
        companyId,
        title: body.title.trim(),
        description,
        status,
        priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assigneeId: body.assigneeId || null,
        jobId: body.jobId || null,
        clientId: body.clientId || null,
        parentTaskId: body.parentTaskId || null,
        createdBy: user.id,
        updatedAt: new Date(),
      },
      include: {
        Assignee: {
          select: { id: true, name: true, email: true },
        },
        Creator: {
          select: { id: true, name: true, email: true },
        },
        Job: {
          select: { id: true, title: true },
        },
        Client: {
          select: { id: true, name: true },
        },
      },
    });

    // Create mentions if any
    if (mentionedUserIds.length > 0) {
      await createMentions(db, companyId, task.id, null, mentionedUserIds);
    }

    // Create audit event
    await db.auditEvent.create({
      data: {
        id: crypto.randomUUID(),
        companyId,
        userId: user.id,
        action: "task.created",
        entityType: "task",
        entityId: task.id,
        metadata: {
          title: task.title,
          status: task.status,
          priority: task.priority,
          assigneeId: task.assigneeId,
          jobId: task.jobId,
          clientId: task.clientId,
          parentTaskId: task.parentTaskId,
        },
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
      },
    });

    return jsonOk({ task }, 201);
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[POST /api/tasks] Error:", e);
    return jsonErr(e, 500);
  }
});

// Helper to extract @username mentions
function extractMentions(text: string): string[] {
  const regex = /@(\w+)/g;
  const matches = text.matchAll(regex);
  return Array.from(matches).map((m) => m[1]);
}

// Helper to create mention records
async function createMentions(
  db: any,
  companyId: string,
  taskId: string | null,
  commentId: string | null,
  usernames: string[]
) {
  if (usernames.length === 0) return;

  // Find users by email or name matching username
  const users = await db.user.findMany({
    where: {
      companyId,
      OR: [
        { email: { in: usernames.map((u) => `${u}@`) } },
        { name: { in: usernames } },
      ],
    },
    select: { id: true },
  });

  if (users.length === 0) return;

  await db.mention.createMany({
    data: users.map((user: { id: string; name: string; email: string }) => ({
      id: crypto.randomUUID(),
      companyId,
      taskId,
      commentId,
      userId: user.id,
      notified: false,
    })),
  });
}
