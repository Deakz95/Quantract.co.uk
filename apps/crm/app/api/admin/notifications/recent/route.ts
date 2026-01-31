import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";
import { timeStart, logPerf } from "@/lib/perf/timing";
import { createTtlCache } from "@/lib/perf/ttlCache";

const notifCache = createTtlCache<object>();

export async function GET() {
  const stopTotal = timeStart("notifications_recent_total");
  let msAuth = 0;
  let msDb = 0;

  try {
    const stopAuth = timeStart("notifications_recent_auth");
    await requireRole("admin");
    const companyId = await requireCompanyId();
    msAuth = stopAuth();
    if (!companyId) {
      logPerf("notifications_recent", { msTotal: stopTotal(), msAuth, ok: false, err: "no_company" });
      return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });
    }

    const json = await notifCache.getOrSet(companyId, 15_000, async () => {
      const stopDb = timeStart("notifications_recent_db");
      const [logs, unreadCount] = await Promise.all([
        prisma.notificationLog.findMany({
          where: { companyId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            channel: true,
            eventKey: true,
            recipient: true,
            status: true,
            createdAt: true,
            quoteId: true,
            invoiceId: true,
            jobId: true,
          },
        }),
        prisma.notificationLog.count({
          where: { companyId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        }),
      ]);
      msDb = stopDb();

      return {
        ok: true,
        logs: logs.map((l: any) => ({
          ...l,
          createdAtISO: l.createdAt?.toISOString?.() ?? new Date().toISOString(),
        })),
        unreadCount,
      };
    });

    logPerf("notifications_recent", { msTotal: stopTotal(), msAuth, msDb, cacheHit: msDb === 0, ok: true });
    return NextResponse.json(json);
  } catch (error) {
    logPerf("notifications_recent", { msTotal: stopTotal(), msAuth, msDb, ok: false, err: "exception" });
    console.error("GET /api/admin/notifications/recent error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
