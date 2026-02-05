import { NextRequest, NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/admin/storage/insights
 *
 * Returns storage insights for admin cleanup:
 * - Largest files (paginated)
 * - Files older than N days
 * - Per-type breakdown with counts and sizes
 *
 * Query params:
 *   limit   - max results per section (default 50, max 100)
 *   offset  - pagination offset for largest files (default 0)
 *   olderThanDays - threshold for "old files" section (default 180)
 */
export const GET = withRequestLogging(async function GET(req: NextRequest) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const cid = authCtx.companyId;
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
    const olderThanDays = Math.max(Number(url.searchParams.get("olderThanDays")) || 180, 1);

    const olderThanDate = new Date();
    olderThanDate.setDate(olderThanDate.getDate() - olderThanDays);

    const [largestFiles, oldFiles, typeBreakdown, totalCount] = await Promise.all([
      // Largest files (active only)
      prisma.document.findMany({
        where: { companyId: cid, deletedAt: null },
        select: {
          id: true,
          type: true,
          mimeType: true,
          sizeBytes: true,
          originalFilename: true,
          createdAt: true,
          storageProvider: true,
        },
        orderBy: { sizeBytes: "desc" },
        take: limit,
        skip: offset,
      }),

      // Old files (active only, older than N days)
      prisma.document.findMany({
        where: {
          companyId: cid,
          deletedAt: null,
          createdAt: { lt: olderThanDate },
        },
        select: {
          id: true,
          type: true,
          mimeType: true,
          sizeBytes: true,
          originalFilename: true,
          createdAt: true,
          storageProvider: true,
        },
        orderBy: { createdAt: "asc" },
        take: limit,
      }),

      // Per-type breakdown
      prisma.$queryRaw<Array<{ type: string; count: bigint; totalBytes: bigint }>>`
        SELECT "type", COUNT(*)::BIGINT AS "count", COALESCE(SUM("sizeBytes"), 0)::BIGINT AS "totalBytes"
        FROM "Document"
        WHERE "companyId" = ${cid} AND "deletedAt" IS NULL
        GROUP BY "type"
        ORDER BY "totalBytes" DESC
      `,

      // Total active document count (for pagination)
      prisma.document.count({
        where: { companyId: cid, deletedAt: null },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      largestFiles,
      oldFiles,
      typeBreakdown: typeBreakdown.map((r: { type: string; count: bigint; totalBytes: bigint }) => ({
        type: r.type,
        count: Number(r.count),
        totalBytes: Number(r.totalBytes),
      })),
      totalCount,
      olderThanDays,
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    logError(error, { route: "GET /api/admin/storage/insights" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
