import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { checkOpsAuth } from "@/lib/server/opsAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = checkOpsAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const cursor = url.searchParams.get("cursor") || undefined;

  const prisma = getPrisma();

  const entries = await prisma.opsAuditLog.findMany({
    take: limit + 1,
    orderBy: { createdAt: "desc" },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = entries.length > limit;
  const items = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  return NextResponse.json({
    ok: true,
    items,
    nextCursor,
    hasMore,
  });
}
