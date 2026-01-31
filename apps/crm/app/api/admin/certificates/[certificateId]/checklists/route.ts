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

    const checklists = await prisma.certificateChecklist.findMany({
      where: { certificateId, companyId: authCtx.companyId },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ ok: true, checklists });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}

/** Bulk update checklist answers. Body: { items: [{id, answer, notes?}] } */
export async function PATCH(req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
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
      return NextResponse.json({ ok: false, error: "Certificate is immutable" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) return NextResponse.json({ ok: false, error: "items required" }, { status: 400 });

    const validAnswers = ["pass", "fail", "na", "lim", null];
    const updates = items
      .filter((i: any) => i.id && typeof i.id === "string")
      .map((i: any) => {
        const answer = validAnswers.includes(i.answer) ? i.answer : null;
        return prisma.certificateChecklist.updateMany({
          where: { id: i.id, certificateId, companyId: authCtx.companyId },
          data: {
            answer,
            ...(typeof i.notes === "string" ? { notes: i.notes } : {}),
          },
        });
      });

    await prisma.$transaction(updates);

    const checklists = await prisma.certificateChecklist.findMany({
      where: { certificateId, companyId: authCtx.companyId },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ ok: true, checklists });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}
