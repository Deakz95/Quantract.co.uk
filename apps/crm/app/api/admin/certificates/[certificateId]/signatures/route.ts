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

    const signatures = await prisma.certificateSignatureRecord.findMany({
      where: { certificateId, companyId: authCtx.companyId },
      orderBy: [{ role: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ ok: true, signatures });
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

    const signerRole = String(body.role || "").trim();
    const signerName = String(body.signerName || "").trim();
    if (!signerRole || !signerName) return NextResponse.json({ ok: false, error: "role and signerName required" }, { status: 400 });

    const maxSort = await prisma.certificateSignatureRecord.aggregate({
      where: { certificateId, role: signerRole },
      _max: { sortOrder: true },
    });

    const signature = await prisma.certificateSignatureRecord.create({
      data: {
        companyId: authCtx.companyId,
        certificateId,
        role: signerRole,
        signerName,
        signerEmail: body.signerEmail ? String(body.signerEmail).trim().toLowerCase() : null,
        signatureText: body.signatureText ? String(body.signatureText) : null,
        signedAt: body.signedAt ? new Date(body.signedAt) : new Date(),
        qualification: body.qualification ? String(body.qualification) : null,
        isPrimary: body.isPrimary !== false,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json({ ok: true, signature }, { status: 201 });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
}
