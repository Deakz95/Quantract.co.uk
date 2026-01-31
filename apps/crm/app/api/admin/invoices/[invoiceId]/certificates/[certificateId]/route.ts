import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const DELETE = withRequestLogging(async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ invoiceId: string; certificateId: string }> },
) {
  await requireRole("admin");
  const companyId = await requireCompanyId();
  const { invoiceId, certificateId } = await getRouteParams(ctx);

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });

  await prisma.invoiceCertificate.deleteMany({
    where: { invoiceId, certificateId, companyId },
  });

  return NextResponse.json({ ok: true });
});
