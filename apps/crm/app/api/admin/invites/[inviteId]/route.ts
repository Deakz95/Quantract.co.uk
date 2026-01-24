import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { prisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export const DELETE = withRequestLogging(async function DELETE(_req: Request, ctx: { params: Promise<{ inviteId: string }> }) {
  const session = await requireRole("admin");
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const companyId = await requireCompanyId();
  if (!companyId) return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });

  const { inviteId } = await getRouteParams(ctx);
  await prisma.invite.deleteMany({ where: { id: inviteId, companyId } });
  return NextResponse.json({ ok: true });
});
