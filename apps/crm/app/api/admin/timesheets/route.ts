import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;

    const items = await client.timesheet.findMany({
      where: {
        companyId: authCtx.companyId,
        ...(status ? { status } : {}),
      },
      orderBy: { weekStart: "desc" },
      include: {
        engineer: { select: { id: true, name: true, email: true } },
        timeEntries: { select: { startedAt: true, endedAt: true, breakMinutes: true } },
      },
    });

    return NextResponse.json({ ok: true, items: items || [] });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/timesheets", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/timesheets", action: "list" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
