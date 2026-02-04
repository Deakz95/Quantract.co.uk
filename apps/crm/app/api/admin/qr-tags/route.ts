import { NextRequest, NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

export const GET = withRequestLogging(
  async function GET(req: NextRequest) {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "admin" && role !== "office") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const url = new URL(req.url);
      const status = url.searchParams.get("status") || undefined;
      const cursor = url.searchParams.get("cursor") || undefined;
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100);

      const where: Record<string, unknown> = { companyId: authCtx.companyId };
      if (status) where.status = status;

      const tags = await prisma.qrTag.findMany({
        where,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
        include: {
          assignment: {
            include: {
              certificate: { select: { id: true, certificateNumber: true, type: true } },
              document: { select: { id: true, originalFilename: true } },
              assignedBy: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      const hasMore = tags.length > limit;
      const results = hasMore ? tags.slice(0, limit) : tags;
      const nextCursor = hasMore ? results[results.length - 1].id : undefined;

      return NextResponse.json({ ok: true, tags: results, nextCursor });
    } catch (e: any) {
      if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      console.error("GET /api/admin/qr-tags error:", e);
      return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
    }
  },
);
