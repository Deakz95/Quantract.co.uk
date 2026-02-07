import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireRoles, requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

/** POST: generate a shareable verification link for a certificate */
export async function POST(req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const authCtx = await requireCompanyContext();
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

  const { certificateId } = await getRouteParams(ctx);
  const body = await req.json().catch(() => ({}));
  const expiresInDays = typeof body?.expiresInDays === "number" && body.expiresInDays > 0
    ? body.expiresInDays
    : 30;

  const cert = await prisma.certificate.findFirst({
    where: { id: certificateId, companyId: authCtx.companyId },
    select: { id: true, status: true, verificationToken: true },
  });
  if (!cert) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  let verificationToken = cert.verificationToken;

  // Generate a token if the certificate doesn't already have one
  if (!verificationToken) {
    verificationToken = randomBytes(24).toString("hex");
    await prisma.certificate.update({
      where: { id: certificateId },
      data: { verificationToken },
    });
  }

  const publicBase =
    process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_ORIGIN || "";
  const shareUrl = `${publicBase}/verify/${verificationToken}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  return NextResponse.json({
    ok: true,
    shareUrl,
    expiresAt: expiresAt.toISOString(),
  });
}
