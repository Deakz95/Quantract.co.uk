import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await getRouteParams(ctx);
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { company: true }
  });
  if (!invite) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ ok: false, error: "Already used" }, { status: 410 });
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return NextResponse.json({ ok: false, error: "Expired" }, { status: 410 });

  return NextResponse.json({
    ok: true,
    invite: {
      role: invite.role,
      email: invite.email,
      name: invite.name,
      expiresAtISO: invite.expiresAt ? invite.expiresAt.toISOString() : null,
      company: {
        id: invite.company.id,
        name: invite.company.name,
        slug: invite.company.slug,
      },
    },
  });
});
