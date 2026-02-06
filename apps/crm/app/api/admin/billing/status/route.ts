import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { hasAdminBypass, getPlanDefinition, getTrialStatus } from "@/lib/billing/plans";
import { timeStart, logPerf } from "@/lib/perf/timing";
import { createTtlCache } from "@/lib/perf/ttlCache";

const billingCache = createTtlCache<object>();

export const GET = withRequestLogging(async function GET() {
  const stopTotal = timeStart("billing_status_total");
  let msAuth = 0;
  let msDb = 0;

  const stopAuth = timeStart("billing_status_auth");
  const authCtx = await requireCompanyContext();
  const effectiveRole = getEffectiveRole(authCtx);
  if (effectiveRole !== "admin" && effectiveRole !== "office") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const companyId = authCtx.companyId;
  const userEmail = authCtx.email;
  msAuth = stopAuth();

  const client = getPrisma();

  if (!client || !companyId) {
    logPerf("billing_status", { msTotal: stopTotal(), msAuth, ok: false, err: "no_prisma_or_company" });
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const json = await billingCache.getOrSet(companyId, 60_000, async () => {
    const stopDb = timeStart("billing_status_db");
    const company = await client.company.findUnique({
      where: { id: companyId },
      select: {
        plan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        trialEnd: true,
        trialStartedAt: true,
        billing: {
          select: {
            plan: true,
            subscriptionStatus: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            trialStartedAt: true,
            trialEnd: true,
            enabledModules: true,
            extraUsers: true,
            extraEntities: true,
            extraStorageMB: true,
          },
        },
      },
    });
    msDb = stopDb();

    if (!company) return { _status: 404, ok: false };

    // Use billing table if exists, fallback to company fields
    const billing = company.billing;
    const effectivePlan = billing?.plan || company.plan;
    const effectiveStatus = billing?.subscriptionStatus || company.subscriptionStatus;
    const effectiveTrialStartedAt = billing?.trialStartedAt || company.trialStartedAt;
    const effectiveTrialEnd = billing?.trialEnd || company.trialEnd;
    const effectivePeriodEnd = billing?.currentPeriodEnd || company.currentPeriodEnd;

    const hasBypass = hasAdminBypass(userEmail);
    const displayPlan = hasBypass ? "pro" : effectivePlan;
    const planDef = getPlanDefinition(displayPlan, userEmail);
    const trialStatus = getTrialStatus(effectivePlan, effectiveTrialStartedAt, userEmail);

    return {
      ok: true,
      plan: displayPlan,
      planLabel: planDef.label,
      subscriptionStatus: hasBypass ? "active" : effectiveStatus,
      currentPeriodStart: billing?.currentPeriodStart || null,
      currentPeriodEnd: effectivePeriodEnd,
      trialEnd: effectiveTrialEnd,
      cancelAtPeriodEnd: billing?.cancelAtPeriodEnd || false,
      hasBypass,
      trial: trialStatus,
      // New fields from CompanyBilling
      modules: billing?.enabledModules || [],
      addOns: {
        extraUsers: billing?.extraUsers || 0,
        extraEntities: billing?.extraEntities || 0,
        extraStorageMB: billing?.extraStorageMB || 0,
      },
    };
  });

  const resp = json as any;
  if (resp._status) {
    const { _status, ...body } = resp;
    logPerf("billing_status", { msTotal: stopTotal(), msAuth, msDb, cacheHit: false, ok: false });
    return NextResponse.json(body, { status: _status });
  }
  logPerf("billing_status", { msTotal: stopTotal(), msAuth, msDb, cacheHit: msDb === 0, ok: true });
  return NextResponse.json(resp);
});
