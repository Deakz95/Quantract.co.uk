import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

/** POST: restore public verification for a previously revoked certificate */
export async function POST(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
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
      select: { id: true, verificationToken: true, verificationRevokedAt: true },
    });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    if (!cert.verificationToken) {
      return NextResponse.json({ ok: false, error: "Certificate has no verification token." }, { status: 400 });
    }
    if (!cert.verificationRevokedAt) {
      return NextResponse.json({ ok: false, error: "Verification is not currently revoked." }, { status: 409 });
    }

    await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        verificationRevokedAt: null,
        verificationRevokedReason: null,
      },
    });

    return NextResponse.json({ ok: true, verificationRevokedAt: null, verificationRevokedReason: null });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "restore_failed" }, { status: 500 });
  }
}
