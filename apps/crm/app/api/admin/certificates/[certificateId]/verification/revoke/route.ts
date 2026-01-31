import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

/** POST: revoke public verification for a certificate */
export async function POST(req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { certificateId } = await getRouteParams(ctx);

    const cert = await prisma.certificate.findFirst({
      where: { id: certificateId, companyId: authCtx.companyId },
      select: { id: true, status: true, verificationToken: true, verificationRevokedAt: true },
    });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (!cert.verificationToken) {
      return NextResponse.json({ ok: false, error: "Certificate has no verification token." }, { status: 400 });
    }
    if (cert.verificationRevokedAt) {
      return NextResponse.json({ ok: false, error: "Verification is already revoked." }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : null;

    const updated = await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        verificationRevokedAt: new Date(),
        verificationRevokedReason: reason,
      },
      select: {
        id: true,
        verificationToken: true,
        verificationRevokedAt: true,
        verificationRevokedReason: true,
      },
    });

    return NextResponse.json({
      ok: true,
      verificationRevokedAt: updated.verificationRevokedAt?.toISOString() ?? null,
      verificationRevokedReason: updated.verificationRevokedReason,
    });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "revoke_failed" }, { status: 500 });
  }
}
