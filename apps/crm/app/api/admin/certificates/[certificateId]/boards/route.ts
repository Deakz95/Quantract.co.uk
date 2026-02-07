import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { certificateId } = await getRouteParams(ctx);
    const cert = await prisma.certificate.findFirst({ where: { id: certificateId, companyId: authCtx.companyId } });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const boards = await prisma.distributionBoard.findMany({
      where: { certificateId, companyId: authCtx.companyId },
      include: { circuits: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ ok: true, boards });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { certificateId } = await getRouteParams(ctx);
    const cert = await prisma.certificate.findFirst({ where: { id: certificateId, companyId: authCtx.companyId } });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (cert.status === "issued" || cert.status === "void") {
      return NextResponse.json({ ok: false, error: "Issued certificates are immutable. Create an amendment." }, { status: 409 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const name = String(body.name || "").trim();
    const boardType = String(body.boardType || "").trim();
    if (!name || !boardType) return NextResponse.json({ ok: false, error: "name and boardType required" }, { status: 400 });

    const maxSort = await prisma.distributionBoard.aggregate({
      where: { certificateId },
      _max: { sortOrder: true },
    });

    const board = await prisma.distributionBoard.create({
      data: {
        companyId: authCtx.companyId,
        certificateId,
        name,
        boardType,
        designation: body.designation ? String(body.designation) : null,
        description: body.description ? String(body.description) : null,
        manufacturer: body.manufacturer ? String(body.manufacturer) : null,
        model: body.model ? String(body.model) : null,
        mainSwitchType: body.mainSwitchType ? String(body.mainSwitchType) : null,
        mainSwitchRating: body.mainSwitchRating ? String(body.mainSwitchRating) : null,
        rcdDetails: body.rcdDetails ? String(body.rcdDetails) : null,
        location: body.location ? String(body.location) : null,
        ipRating: body.ipRating ? String(body.ipRating) : null,
        numWays: body.numWays != null ? Number(body.numWays) : null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json({ ok: true, board }, { status: 201 });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
}
