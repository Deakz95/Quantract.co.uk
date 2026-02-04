import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { addBusinessBreadcrumb } from "@/lib/server/observability";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = (await req.json().catch(() => null)) as {
      ids?: string[];
      status?: string;
      engineerId?: string;
    } | null;

    if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ ok: false, error: "ids required" }, { status: 400 });
    }
    if (!body.status && !body.engineerId) {
      return NextResponse.json({ ok: false, error: "status or engineerId required" }, { status: 400 });
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) data.status = body.status;
    if (body.engineerId) data.engineerId = body.engineerId;

    const result = await prisma.job.updateMany({
      where: {
        id: { in: body.ids },
        companyId: authCtx.companyId,
        deletedAt: null,
      },
      data,
    });

    addBusinessBreadcrumb("jobs.bulk_updated", {
      count: result.count,
      fields: Object.keys(data).filter((k) => k !== "updatedAt"),
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "bulk_update_failed";
    const status = msg.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
