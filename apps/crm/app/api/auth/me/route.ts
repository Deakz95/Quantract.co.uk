import { NextResponse } from "next/server";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { timeStart, logPerf } from "@/lib/perf/timing";
import { createTtlCache } from "@/lib/perf/ttlCache";

const cache = createTtlCache<object>();

export const GET = withRequestLogging(async function GET() {
  const stopTotal = timeStart("auth_me_total");
  let msAuth = 0;
  let msDb = 0;

  try {
    const stopAuth = timeStart("auth_me_auth");
    const ctx = await requireCompanyContext();
    msAuth = stopAuth();

    const cacheKey = `${ctx.userId}:${ctx.companyId}`;
    const json = await cache.getOrSet(cacheKey, 30_000, async () => {
      const stopDbInner = timeStart("auth_me_db");
      const db = getPrisma();
      if (!db || process.env.QT_USE_PRISMA !== "1") {
        return { ok: false, error: "service_unavailable" };
      }

      const user = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { email: true, role: true, passwordHash: true }
      });
      msDb = stopDbInner();
      if (!user) {
        return { ok: false, error: "user_not_found" };
      }
      return {
        ok: true,
        user: {
          email: user.email,
          role: user.role,
          hasPassword: Boolean(user.passwordHash),
        }
      };
    });

    const resp = json as any;
    logPerf("auth_me", { msTotal: stopTotal(), msAuth, msDb, cacheHit: msDb === 0, ok: resp.ok !== false });
    if (resp.error === "service_unavailable") return NextResponse.json(resp, { status: 503 });
    if (resp.error === "user_not_found") return NextResponse.json(resp, { status: 404 });
    return NextResponse.json(resp);
  } catch (error: any) {
    logPerf("auth_me", { msTotal: stopTotal(), msAuth, msDb, ok: false, err: "exception" });
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
