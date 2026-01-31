import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getRouteParams } from "@/lib/server/routeParams";
import { getPrisma } from "@/lib/server/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { certificateId } = await getRouteParams(ctx);
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 500 });
  }

  // Get amendments of this certificate + the certificate it amends (if any)
  const [amendments, original] = await Promise.all([
    prisma.certificate.findMany({
      where: { companyId, amendsCertificateId: certificateId },
      select: {
        id: true,
        certificateNumber: true,
        type: true,
        status: true,
        currentRevision: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.certificate.findFirst({
      where: { id: certificateId, companyId },
      select: { amendsCertificateId: true },
    }),
  ]);

  let amendsInfo = null;
  if (original?.amendsCertificateId) {
    amendsInfo = await prisma.certificate.findFirst({
      where: { id: original.amendsCertificateId, companyId },
      select: {
        id: true,
        certificateNumber: true,
        type: true,
        status: true,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    amendments,
    amends: amendsInfo,
  });
}
