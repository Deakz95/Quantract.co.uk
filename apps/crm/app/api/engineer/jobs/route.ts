import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "engineer" && effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    // Find the engineer record
    const engineer = await client.engineer.findFirst({
      where: {
        companyId: authCtx.companyId,
        OR: [
          { email: authCtx.email },
          { users: { some: { id: authCtx.userId } } },
        ],
      },
    });

    if (!engineer) {
      return NextResponse.json({ ok: true, jobs: [] });
    }

    // Find jobs assigned to this engineer
    const jobs = await client.job.findMany({
      where: {
        companyId: authCtx.companyId,
        engineerId: engineer.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        site: { select: { id: true, name: true, address1: true, city: true, postcode: true } },
      },
    });

    return NextResponse.json({ ok: true, jobs: jobs || [] });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/engineer/jobs", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/engineer/jobs", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
