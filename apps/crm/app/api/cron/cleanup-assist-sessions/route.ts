import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { trackCronRun } from "@/lib/server/cronTracker";

export const runtime = "nodejs";

/**
 * Cron endpoint: cleans up expired remote assist sessions.
 * Deletes sessions that expired more than 24 hours ago.
 * Protected by CRON_SECRET header in production.
 */
export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

  try {
    const result = await trackCronRun("cleanup-assist-sessions", async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const r = await prisma.remoteAssistSession.deleteMany({
        where: { expiresAt: { lt: cutoff } },
      });
      return { deleted: r.count };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("[cron/cleanup-assist-sessions]", e);
    return NextResponse.json({ ok: false, error: "cleanup_failed" }, { status: 500 });
  }
}
