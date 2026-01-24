import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
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
  async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
      await requireRoles("admin");
      const companyId = await requireCompanyId();
      const { id } = await getRouteParams(ctx);

      const db = getPrisma();
      if (!db) {
        return jsonErr("Database not available", 503);
      }

      const template = await db.checklistTemplate.findFirst({
        where: { id, companyId },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (!template) return jsonErr("Template not found", 404);

      return jsonOk({ template });
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      return jsonErr(e, 500);
    }
  }
);

export const PATCH = withRequestLogging(
  async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
      await requireRoles("admin");
      const companyId = await requireCompanyId();
      const { id } = await getRouteParams(ctx);

      const db = getPrisma();
      if (!db) {
        return jsonErr("Database not available", 503);
      }

      const body = (await req.json().catch(() => ({}))) as {
        title?: string;
        description?: string;
        isActive?: boolean;
        items?: Array<{
          id?: string;
          title: string;
          description?: string;
          isRequired?: boolean;
          sortOrder?: number;
        }>;
      };

      // Verify ownership
      const existing = await db.checklistTemplate.findFirst({
        where: { id, companyId },
      });

      if (!existing) return jsonErr("Template not found", 404);

      // Update template and items
      const template = await db.checklistTemplate.update({
        where: { id },
        data: {
          title: body.title,
          description: body.description,
          isActive: body.isActive,
          updatedAt: new Date(),
          ...(body.items && {
            items: {
              deleteMany: {},
              create: body.items.map((item, index) => ({
                id: item.id || crypto.randomUUID(),
                title: item.title,
                description: item.description || null,
                isRequired: item.isRequired !== false,
                sortOrder: item.sortOrder ?? index,
              })),
            },
          }),
        },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      return jsonOk({ template });
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      console.error("[PATCH /api/admin/checklist-templates/[id]] Error:", e);
      return jsonErr(e, 500);
    }
  }
);

export const DELETE = withRequestLogging(
  async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
      await requireRoles("admin");
      const companyId = await requireCompanyId();
      const { id } = await getRouteParams(ctx);

      const db = getPrisma();
      if (!db) {
        return jsonErr("Database not available", 503);
      }

      // Verify ownership
      const existing = await db.checklistTemplate.findFirst({
        where: { id, companyId },
      });

      if (!existing) return jsonErr("Template not found", 404);

      // Soft delete by setting isActive = false
      await db.checklistTemplate.update({
        where: { id },
        data: { isActive: false, updatedAt: new Date() },
      });

      return jsonOk({ deleted: true });
    } catch (e: any) {
      if (e?.status === 401) return jsonErr("unauthorized", 401);
      if (e?.status === 403) return jsonErr("forbidden", 403);
      return jsonErr(e, 500);
    }
  }
);
