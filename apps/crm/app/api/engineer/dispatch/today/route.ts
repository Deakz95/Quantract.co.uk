import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(_req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "engineer" && role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;

    // Identify the engineer by their user email
    const engineer = await prisma.engineer.findFirst({
      where: { companyId: cid, email: authCtx.email },
    });
    if (!engineer) {
      return NextResponse.json({ ok: false, error: "engineer_not_found" }, { status: 404 });
    }

    // Today's schedule: midnight to midnight
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const entries = await prisma.scheduleEntry.findMany({
      where: {
        companyId: cid,
        engineerId: engineer.id,
        deletedAt: null,
        startAt: { lt: todayEnd },
        endAt: { gt: todayStart },
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            status: true,
            client: { select: { companyName: true } },
            site: { select: { name: true, address1: true, postcode: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json({
      ok: true,
      entries: entries.map((e: any) => ({
        id: e.id,
        jobId: e.jobId,
        jobTitle: (e as any).job?.title,
        jobStatus: (e as any).job?.status,
        clientName: (e as any).job?.client?.companyName,
        siteAddress: (e as any).job?.site?.address1,
        sitePostcode: (e as any).job?.site?.postcode,
        startAtISO: e.startAt.toISOString(),
        endAtISO: e.endAt.toISOString(),
        status: e.status,
        notes: e.notes,
      })),
    });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/engineer/dispatch/today", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
