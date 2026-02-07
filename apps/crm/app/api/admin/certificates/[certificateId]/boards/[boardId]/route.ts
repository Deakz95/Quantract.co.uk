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
      include: { circuits: { orderBy: { sortOrder: "asc" } } },
    });
    if (!board) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    return NextResponse.json({ ok: true, board });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}

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

    const existing = await prisma.distributionBoard.findFirst({
      where: { id: boardId, certificateId, companyId: authCtx.companyId },
    });
    if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const allowedFields = [
      "name", "boardType", "designation", "description", "manufacturer", "model",
      "mainSwitchType", "mainSwitchRating", "rcdDetails", "location", "ipRating",
      "numWays", "sortOrder",
    ];
    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in body) {
        if (field === "numWays" || field === "sortOrder") {
          data[field] = body[field] != null ? Number(body[field]) : null;
        } else {
          data[field] = body[field] != null ? String(body[field]) : null;
        }
      }
    }

    const board = await prisma.distributionBoard.update({
      where: { id: boardId },
      data,
      include: { circuits: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json({ ok: true, board });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}

export async function DELETE(
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
    if (cert.status === "issued" || cert.status === "void") {
      return NextResponse.json({ ok: false, error: "Issued certificates are immutable. Create an amendment." }, { status: 409 });
    }

    const existing = await prisma.distributionBoard.findFirst({
      where: { id: boardId, certificateId, companyId: authCtx.companyId },
    });
    if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    await prisma.distributionBoard.delete({ where: { id: boardId } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
}
