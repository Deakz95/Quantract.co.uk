import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ certificateId: string; boardId: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { certificateId, boardId } = await getRouteParams(ctx);
    const cert = await prisma.certificate.findFirst({ where: { id: certificateId, companyId: authCtx.companyId } });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const board = await prisma.distributionBoard.findFirst({
      where: { id: boardId, certificateId, companyId: authCtx.companyId },
    });
    if (!board) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const circuits = await prisma.distributionBoardCircuit.findMany({
      where: { boardId, companyId: authCtx.companyId },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ ok: true, circuits });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ certificateId: string; boardId: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { certificateId, boardId } = await getRouteParams(ctx);
    const cert = await prisma.certificate.findFirst({ where: { id: certificateId, companyId: authCtx.companyId } });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (cert.status === "issued" || cert.status === "void") {
      return NextResponse.json({ ok: false, error: "Issued certificates are immutable. Create an amendment." }, { status: 409 });
    }

    const board = await prisma.distributionBoard.findFirst({
      where: { id: boardId, certificateId, companyId: authCtx.companyId },
    });
    if (!board) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const circuitNum = String(body.circuitNum || "").trim();
    if (!circuitNum) return NextResponse.json({ ok: false, error: "circuitNum required" }, { status: 400 });

    const maxSort = await prisma.distributionBoardCircuit.aggregate({
      where: { boardId },
      _max: { sortOrder: true },
    });

    const circuit = await prisma.distributionBoardCircuit.create({
      data: {
        companyId: authCtx.companyId,
        boardId,
        circuitNum,
        description: body.description ? String(body.description) : null,
        phase: body.phase ? String(body.phase) : null,
        deviceType: body.deviceType ? String(body.deviceType) : null,
        rating: body.rating ? String(body.rating) : null,
        bsen: body.bsen ? String(body.bsen) : null,
        cableMm2: body.cableMm2 ? String(body.cableMm2) : null,
        cpcMm2: body.cpcMm2 ? String(body.cpcMm2) : null,
        cableType: body.cableType ? String(body.cableType) : null,
        maxZs: body.maxZs ? String(body.maxZs) : null,
        measuredZs: body.measuredZs ? String(body.measuredZs) : null,
        r1r2: body.r1r2 ? String(body.r1r2) : null,
        r2: body.r2 ? String(body.r2) : null,
        insMohm: body.insMohm ? String(body.insMohm) : null,
        rcdMa: body.rcdMa ? String(body.rcdMa) : null,
        rcdMs: body.rcdMs ? String(body.rcdMs) : null,
        rcdType: body.rcdType ? String(body.rcdType) : null,
        status: body.status ? String(body.status) : null,
        code: body.code ? String(body.code) : null,
        isEmpty: body.isEmpty === true,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json({ ok: true, circuit }, { status: 201 });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
}

/** Bulk update circuits. Body: { circuits: [{ id, ...fields }] } */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ certificateId: string; boardId: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { certificateId, boardId } = await getRouteParams(ctx);
    const cert = await prisma.certificate.findFirst({ where: { id: certificateId, companyId: authCtx.companyId } });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (cert.status === "issued" || cert.status === "void") {
      return NextResponse.json({ ok: false, error: "Issued certificates are immutable. Create an amendment." }, { status: 409 });
    }

    const board = await prisma.distributionBoard.findFirst({
      where: { id: boardId, certificateId, companyId: authCtx.companyId },
    });
    if (!board) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    const items = Array.isArray(body?.circuits) ? body.circuits : [];
    if (items.length === 0) return NextResponse.json({ ok: false, error: "circuits required" }, { status: 400 });

    const allowedFields = [
      "circuitNum", "description", "phase", "deviceType", "rating", "bsen",
      "cableMm2", "cpcMm2", "cableType", "maxZs", "measuredZs", "r1r2", "r2",
      "insMohm", "rcdMa", "rcdMs", "rcdType", "status", "code", "isEmpty", "sortOrder",
    ];

    const updates = items
      .filter((i: any) => i.id && typeof i.id === "string")
      .map((i: any) => {
        const data: Record<string, any> = {};
        for (const field of allowedFields) {
          if (field in i) {
            if (field === "isEmpty") {
              data[field] = i[field] === true;
            } else if (field === "sortOrder") {
              data[field] = i[field] != null ? Number(i[field]) : 0;
            } else {
              data[field] = i[field] != null ? String(i[field]) : null;
            }
          }
        }
        return prisma.distributionBoardCircuit.updateMany({
          where: { id: i.id, boardId, companyId: authCtx.companyId },
          data,
        });
      });

    await prisma.$transaction(updates);

    const circuits = await prisma.distributionBoardCircuit.findMany({
      where: { boardId, companyId: authCtx.companyId },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ ok: true, circuits });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}
