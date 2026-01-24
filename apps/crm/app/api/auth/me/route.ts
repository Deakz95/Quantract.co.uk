import { NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";

export const GET = withRequestLogging(async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const db = getPrisma();
  if (!db || process.env.QT_USE_PRISMA !== "1") {
    return NextResponse.json({ ok: false, error: "prisma_unavailable" }, { status: 503 });
  }

  const user = await db.user.findUnique({ where: { id: ctx.userId }, select: { email: true, role: true, passwordHash: true }});
  if (!user) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    user: {
      email: user.email,
      role: user.role,
      hasPassword: Boolean(user.passwordHash),
    }
  });
});
