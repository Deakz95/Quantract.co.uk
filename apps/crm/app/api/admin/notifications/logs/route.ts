import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/admin/notifications/logs
 * Get notification logs for the company
 */
export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");
  const eventKey = searchParams.get("eventKey");
  const clientId = searchParams.get("clientId");
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Build where clause
  const where: Record<string, unknown> = { companyId };

  if (channel && ["SMS", "EMAIL"].includes(channel)) {
    where.channel = channel;
  }
  if (status && ["sent", "skipped", "failed"].includes(status)) {
    where.status = status;
  }
  if (eventKey) {
    where.eventKey = eventKey;
  }
  if (clientId) {
    where.clientId = clientId;
  }

  const [logs, total] = await Promise.all([
    client.notificationLog.findMany({
      where,
      select: {
        id: true,
        channel: true,
        eventKey: true,
        recipient: true,
        clientId: true,
        jobId: true,
        invoiceId: true,
        quoteId: true,
        certificateId: true,
        status: true,
        skipReason: true,
        errorMessage: true,
        cost: true,
        segments: true,
        providerMessageId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    client.notificationLog.count({ where }),
  ]);

  // Get stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const [sentToday, sentThisMonth, skippedThisMonth, failedThisMonth] = await Promise.all([
    client.notificationLog.count({
      where: {
        companyId,
        status: "sent",
        createdAt: { gte: today },
      },
    }),
    client.notificationLog.count({
      where: {
        companyId,
        status: "sent",
        createdAt: { gte: thisMonth },
      },
    }),
    client.notificationLog.count({
      where: {
        companyId,
        status: "skipped",
        createdAt: { gte: thisMonth },
      },
    }),
    client.notificationLog.count({
      where: {
        companyId,
        status: "failed",
        createdAt: { gte: thisMonth },
      },
    }),
  ]);

  // Get skip reason breakdown
  const skipReasons = await client.notificationLog.groupBy({
    by: ["skipReason"],
    where: {
      companyId,
      status: "skipped",
      createdAt: { gte: thisMonth },
      skipReason: { not: null },
    },
    _count: true,
  });

  return NextResponse.json({
    ok: true,
    logs,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + logs.length < total,
    },
    stats: {
      sentToday,
      sentThisMonth,
      skippedThisMonth,
      failedThisMonth,
      skipReasons: skipReasons.map((r: { skipReason: string | null; _count: number }) => ({
        reason: r.skipReason,
        count: r._count,
      })),
    },
  });
});
