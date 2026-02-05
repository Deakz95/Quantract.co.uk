import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { logError } from "@/lib/server/observability";
import { timeStart, logPerf } from "@/lib/perf/timing";
import { createTtlCache } from "@/lib/perf/ttlCache";

/** Max impersonation duration: 60 minutes (must match serverAuth.ts) */
const IMPERSONATION_TTL_MS = 60 * 60 * 1000;

export const dynamic = "force-dynamic";

const impersonateCache = createTtlCache<object>();

// Safe default response - never 500
const SAFE_DEFAULT = {
  ok: true,
  isBeingImpersonated: false,
  impersonatedBy: null,
  isImpersonating: false,
  impersonatingUser: null,
  impersonationId: null,
  startedAt: null,
};

/**
 * GET /api/admin/impersonate/status
 * Returns the current impersonation status for the logged-in user.
 * HARDENED: Never returns 500, always returns safe defaults on error.
 */
export async function GET() {
  const stopTotal = timeStart("impersonate_status_total");
  let msAuth = 0;
  let msDb = 0;

  try {
    const stopAuth = timeStart("impersonate_status_auth");
    const ctx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(ctx);
    msAuth = stopAuth();

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      logPerf("impersonate_status", { msTotal: stopTotal(), msAuth, ok: false, err: "forbidden" });
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const cacheKey = `${ctx.companyId}:${ctx.userId}`;
    const json = await impersonateCache.getOrSet(cacheKey, 15_000, async () => {
      const stopDb = timeStart("impersonate_status_db");
      const prisma = getPrisma();

      let [activeImpersonation, beingImpersonated] = await Promise.all([
        prisma.impersonation_logs.findFirst({
          where: { adminUserId: ctx.userId, endedAt: null, companyId: ctx.companyId },
          include: { targetUser: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { startedAt: "desc" },
        }).catch(() => null),
        prisma.impersonation_logs.findFirst({
          where: { targetUserId: ctx.userId, endedAt: null, companyId: ctx.companyId },
          include: { adminUser: { select: { id: true, name: true, email: true } } },
          orderBy: { startedAt: "desc" },
        }).catch(() => null),
      ]);

      // Enforce TTL: auto-expire sessions older than 60 minutes
      if (activeImpersonation && Date.now() - new Date(activeImpersonation.startedAt).getTime() > IMPERSONATION_TTL_MS) {
        await prisma.impersonation_logs.update({ where: { id: activeImpersonation.id }, data: { endedAt: new Date() } }).catch(() => {});
        await prisma.user.update({ where: { id: ctx.userId }, data: { currentImpersonationId: null } }).catch(() => {});
        activeImpersonation = null;
      }
      if (beingImpersonated && Date.now() - new Date(beingImpersonated.startedAt).getTime() > IMPERSONATION_TTL_MS) {
        await prisma.impersonation_logs.update({ where: { id: beingImpersonated.id }, data: { endedAt: new Date() } }).catch(() => {});
        beingImpersonated = null;
      }
      msDb = stopDb();

      return {
        ok: true,
        isBeingImpersonated: !!beingImpersonated,
        impersonatedBy: beingImpersonated?.adminUser
          ? { id: beingImpersonated.adminUser.id, name: beingImpersonated.adminUser.name, email: beingImpersonated.adminUser.email }
          : null,
        isImpersonating: !!activeImpersonation,
        impersonatingUser: activeImpersonation?.targetUser
          ? { id: activeImpersonation.targetUser.id, name: activeImpersonation.targetUser.name, email: activeImpersonation.targetUser.email, role: activeImpersonation.targetUser.role }
          : null,
        impersonationId: activeImpersonation?.id || beingImpersonated?.id || null,
        startedAt: activeImpersonation?.startedAt || beingImpersonated?.startedAt || null,
      };
    });

    logPerf("impersonate_status", { msTotal: stopTotal(), msAuth, msDb, cacheHit: msDb === 0, ok: true });
    return NextResponse.json(json);
  } catch (error) {
    logPerf("impersonate_status", { msTotal: stopTotal(), msAuth, msDb, ok: false, err: "exception" });
    logError(error, { route: "/api/admin/impersonate/status", action: "get_status" });
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    return NextResponse.json(SAFE_DEFAULT);
  }
}
