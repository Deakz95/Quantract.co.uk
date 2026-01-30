import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  try {
    await requireRole("admin");
    const companyId = await requireCompanyId();
    if (!companyId) return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });

    const logs = await prisma.notificationLog.findMany({
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
    });

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const unreadCount = await prisma.notificationLog.count({
      where: { companyId, createdAt: { gte: since } },
    });

    return NextResponse.json({
      ok: true,
      logs: logs.map((l: any) => ({
        ...l,
        createdAtISO: l.createdAt?.toISOString?.() ?? new Date().toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/admin/notifications/recent error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
