import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { isFeatureEnabled } from "@/lib/server/featureFlags";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/** POST: create a remote assist session and return a shareable link */
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const company = await prisma.company.findUnique({ where: { id: authCtx.companyId }, select: { plan: true } });
    if (!isFeatureEnabled(company?.plan, "remote_assist")) {
      return NextResponse.json({ ok: false, error: "feature_not_available", upgrade: true }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const token = randomUUID();

    const session = await prisma.remoteAssistSession.create({
      data: {
        companyId: authCtx.companyId,
        createdBy: authCtx.userId,
        token,
        clientName: body.clientName || null,
        jobId: body.jobId || null,
        status: "waiting",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    return NextResponse.json({ ok: true, data: { ...session, joinUrl: `/assist/${token}` } }, { status: 201 });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});

/** GET: list recent sessions */
export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const sessions = await prisma.remoteAssistSession.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ ok: true, data: sessions });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
