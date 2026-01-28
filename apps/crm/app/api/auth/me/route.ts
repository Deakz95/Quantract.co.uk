import { NextResponse } from "next/server";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";

export const GET = withRequestLogging(async function GET() {
  try {
    const ctx = await requireCompanyContext();

    const db = getPrisma();
    if (!db || process.env.QT_USE_PRISMA !== "1") {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true, role: true, passwordHash: true }
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        email: user.email,
        role: user.role,
        hasPassword: Boolean(user.passwordHash),
      }
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/auth/me", action: "get_session" });
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
});
