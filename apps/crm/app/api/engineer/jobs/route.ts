import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const GET = withRequestLogging(async function GET(req: Request) {
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

    // Parse pagination params
    const url = new URL(req.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_LIMIT)
      : DEFAULT_LIMIT;
    const cursor = url.searchParams.get("cursor") || undefined;

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
      return NextResponse.json({ ok: true, jobs: [], nextCursor: null });
    }

    // Find jobs assigned to this engineer
    const jobs = await client.job.findMany({
      where: {
        companyId: authCtx.companyId,
        engineerId: engineer.id,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // fetch one extra to detect next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        client: { select: { name: true } },
        site: { select: { name: true, address1: true, city: true, postcode: true } },
      },
    });

    const hasMore = jobs.length > limit;
    const page = hasMore ? jobs.slice(0, limit) : jobs;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    // Shape response — lean list fields only
    const shaped = page.map((j: any) => ({
      id: j.id,
      jobNumber: j.jobNumber ?? null,
      title: j.title ?? null,
      status: j.status,
      scheduledAtISO: j.scheduledAt ? new Date(j.scheduledAt).toISOString() : null,
      clientName: j.client?.name ?? null,
      siteName: j.site?.name ?? null,
      siteAddress: [j.site?.address1, j.site?.city, j.site?.postcode]
        .filter(Boolean)
        .join(", ") || null,
    }));

    return NextResponse.json({ ok: true, jobs: shaped, nextCursor });
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
