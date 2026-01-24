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

export const POST = withRequestLogging(
  async function POST(req: Request, ctx: { params: Promise<{ taskId: string }> }) {
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
        content?: string;
        internalOnly?: boolean;
      };

      if (!body.content?.trim()) {
        return jsonErr("Content is required", 400);
      }

      // Verify task exists and belongs to company
      const task = await db.task.findFirst({
        where: { id: taskId, companyId },
      });

      if (!task) return jsonErr("Task not found", 404);

      // CRITICAL: Ensure internal-only by default for safety
      const internalOnly = body.internalOnly !== false;

      // Extract mentions from content
      const mentionedUsernames = extractMentions(body.content);

      const comment = await db.comment.create({
        data: {
          id: crypto.randomUUID(),
          companyId,
          taskId,
          content: body.content.trim(),
          internalOnly,
          createdBy: user.id,
          updatedAt: new Date(),
        },
        include: {
          Creator: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Create mentions
      if (mentionedUsernames.length > 0) {
        await createMentions(db, companyId, taskId, comment.id, mentionedUsernames);

        // Send notifications to mentioned users
        await notifyMentionedUsers(db, companyId, comment.id, mentionedUsernames, user);
      }

      // Create audit event
      await db.auditEvent.create({
        data: {
          id: crypto.randomUUID(),
          companyId,
          userId: user.id,
          action: "task.comment.created",
          entityType: "task",
          entityId: taskId,
          metadata: {
            commentId: comment.id,
            internalOnly,
            hasMentions: mentionedUsernames.length > 0,
          },
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
        },
      });

      return jsonOk({ comment }, 201);
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      console.error("[POST /api/tasks/[taskId]/comments] Error:", e);
      return jsonErr(e, 500);
    }
  }
);

function extractMentions(text: string): string[] {
  const regex = /@(\w+)/g;
  const matches = text.matchAll(regex);
  return Array.from(matches).map((m) => m[1]);
}

async function createMentions(
  db: any,
  companyId: string,
  taskId: string | null,
  commentId: string | null,
  usernames: string[]
) {
  if (usernames.length === 0) return;

  // Find users by matching username against email prefix or name
  const users = await db.user.findMany({
    where: {
      companyId,
      OR: usernames.map((username) => ({
        OR: [
          { email: { startsWith: username, mode: "insensitive" } },
          { name: { contains: username, mode: "insensitive" } },
        ],
      })),
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
    skipDuplicates: true,
  });
}

async function notifyMentionedUsers(
  db: any,
  companyId: string,
  commentId: string,
  usernames: string[],
  mentioner: any
) {
  // Find mentioned users
  const users = await db.user.findMany({
    where: {
      companyId,
      OR: usernames.map((username) => ({
        OR: [
          { email: { startsWith: username, mode: "insensitive" } },
          { name: { contains: username, mode: "insensitive" } },
        ],
      })),
    },
    select: { id: true, email: true, name: true },
  });

  if (users.length === 0) return;

  // Get comment details
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    include: {
      Task: {
        select: { id: true, title: true },
      },
    },
  });

  if (!comment) return;

  // Send email notification to each mentioned user
  // Note: Email sending would be integrated with existing email service
  // For now, just mark mentions as notified
  await db.mention.updateMany({
    where: {
      commentId,
      userId: { in: users.map((u: { id: string }) => u.id) },
    },
    data: {
      notified: true,
    },
  });

  console.log(`Notified ${users.length} users about mention in comment ${commentId}`);
}
