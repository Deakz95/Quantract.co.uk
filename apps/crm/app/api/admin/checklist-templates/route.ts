import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId, getCompanyId } from "@/lib/serverAuth";
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

export const GET = withRequestLogging(async function GET() {
  try {
    await requireRoles("admin");
    const companyId = await requireCompanyId();

    const db = getPrisma();
    if (!db) {
      return jsonErr("Database not available", 503);
    }

    const templates = await db.checklistTemplate.findMany({
      where: { companyId },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({ templates });
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    return jsonErr(e, 500);
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRoles("admin");
    const companyId = await requireCompanyId();

    const db = getPrisma();
    if (!db) {
      return jsonErr("Database not available", 503);
    }

    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      description?: string;
      items?: Array<{
        title: string;
        description?: string;
        isRequired?: boolean;
        sortOrder?: number;
      }>;
    };

    if (!body.title) {
      return jsonErr("Title is required", 400);
    }

    if (!body.items || body.items.length === 0) {
      return jsonErr("At least one checklist item is required", 400);
    }

    const template = await db.checklistTemplate.create({
      data: {
        id: crypto.randomUUID(),
        companyId,
        title: body.title,
        description: body.description || null,
        updatedAt: new Date(),
        items: {
          create: body.items.map((item, index) => ({
            id: crypto.randomUUID(),
            title: item.title,
            description: item.description || null,
            isRequired: item.isRequired !== false,
            sortOrder: item.sortOrder ?? index,
          })),
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return jsonOk({ template }, 201);
  } catch (e: any) {
    if (e?.status === 401) return jsonErr("unauthorized", 401);
    if (e?.status === 403) return jsonErr("forbidden", 403);
    console.error("[POST /api/admin/checklist-templates] Error:", e);
    return jsonErr(e, 500);
  }
});
