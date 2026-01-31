import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId") || undefined;
    const jobId = url.searchParams.get("jobId") || undefined;

    const where: any = { companyId: authCtx.companyId };
    if (clientId) where.clientId = clientId;
    if (jobId) where.jobId = jobId;

    const assets = await prisma.installedAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        client: { select: { id: true, name: true } },
        job: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ ok: true, data: assets });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => null);
    if (!body?.name) {
      return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
    }

    const asset = await prisma.installedAsset.create({
      data: {
        companyId: authCtx.companyId,
        clientId: body.clientId || null,
        jobId: body.jobId || null,
        name: body.name,
        type: body.type || null,
        manufacturer: body.manufacturer || null,
        model: body.model || null,
        serial: body.serial || null,
        installedAt: body.installedAt ? new Date(body.installedAt) : null,
        nextServiceAt: body.nextServiceAt ? new Date(body.nextServiceAt) : null,
        meta: body.meta || null,
      },
    });

    return NextResponse.json({ ok: true, data: asset }, { status: 201 });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    console.error("[POST /api/admin/maintenance/assets]", e);
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
