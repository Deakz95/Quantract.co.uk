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
  async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
    try {
      const authCtx = await requireAuth();
      const user = { id: authCtx.userId, email: authCtx.email, role: authCtx.role };
      const companyId = await requireCompanyId();
      const { jobId } = await getRouteParams(ctx);

      const db = getPrisma();
      if (!db) {
        return jsonErr("Database not available", 503);
      }

      // Verify job exists and belongs to company
      const job = await db.job.findFirst({
        where: { id: jobId, companyId },
      });

      if (!job) return jsonErr("Job not found", 404);

      const checklists = await db.jobChecklist.findMany({
        where: { jobId, companyId },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { attachedAt: "asc" },
      });

      return jsonOk({ checklists });
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      return jsonErr(e, 500);
    }
  }
);

export const POST = withRequestLogging(
  async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
    try {
      const authCtx = await requireAuth();
      const user = { id: authCtx.userId, email: authCtx.email, role: authCtx.role };
      const companyId = await requireCompanyId();
      const { jobId } = await getRouteParams(ctx);

      const db = getPrisma();
      if (!db) {
        return jsonErr("Database not available", 503);
      }

      const body = (await req.json().catch(() => ({}))) as {
        templateId?: string;
        title?: string;
        description?: string;
      };

      // Verify job exists and belongs to company
      const job = await db.job.findFirst({
        where: { id: jobId, companyId },
      });

      if (!job) return jsonErr("Job not found", 404);

      let checklistData: {
        id: string;
        companyId: string;
        jobId: string;
        templateId: string | null;
        title: string;
        description: string | null;
        attachedAt: Date;
        attachedBy: string | null;
        items: {
          create: Array<{
            id: string;
            title: string;
            description: string | null;
            isRequired: boolean;
            sortOrder: number;
          }>;
        };
      };

      if (body.templateId) {
        // Attach from template - create snapshot
        const template = await db.checklistTemplate.findFirst({
          where: { id: body.templateId, companyId },
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            },
          },
        });

        if (!template) return jsonErr("Template not found", 404);

        checklistData = {
          id: crypto.randomUUID(),
          companyId,
          jobId,
          templateId: template.id,
          title: template.title,
          description: template.description,
          attachedAt: new Date(),
          attachedBy: user.id,
          items: {
            create: template.items.map((item: any) => ({
              id: crypto.randomUUID(),
              title: item.title,
              description: item.description,
              isRequired: item.isRequired,
              sortOrder: item.sortOrder,
            })),
          },
        };
      } else if (body.title) {
        // Custom checklist
        return jsonErr("Custom checklists not yet implemented. Use templateId.", 400);
      } else {
        return jsonErr("Either templateId or title is required", 400);
      }

      const checklist = await db.jobChecklist.create({
        data: checklistData,
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      // Create audit event
      await db.auditEvent.create({
        data: {
          id: crypto.randomUUID(),
          companyId,
          userId: user.id,
          action: "checklist.attached",
          entityType: "job",
          entityId: jobId,
          metadata: {
            checklistId: checklist.id,
            checklistTitle: checklist.title,
            templateId: checklist.templateId,
            itemCount: checklist.items.length,
            requiredItemCount: checklist.items.filter((i: any) => i.isRequired).length,
          },
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
        },
      });

      return jsonOk({ checklist }, 201);
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      console.error("[POST /api/jobs/[jobId]/checklists] Error:", e);
      return jsonErr(e, 500);
    }
  }
);
