import { NextResponse } from "next/server";
import { requireRole, getCompanyId, getUserEmail } from "@/lib/serverAuth";
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
  await requireRole("admin");
  const companyId = await getCompanyId();
  const userEmail = await getUserEmail();
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
      },
    });
    msDb = stopDb();

    if (!company) return { _status: 404, ok: false };

    const hasBypass = hasAdminBypass(userEmail);
    const effectivePlan = hasBypass ? "pro" : company.plan;
    const planDef = getPlanDefinition(effectivePlan);
    const trialStatus = getTrialStatus(company.plan, company.trialStartedAt, userEmail);

    return {
      ok: true,
      plan: effectivePlan,
      planLabel: planDef.label,
      subscriptionStatus: hasBypass ? "active" : company.subscriptionStatus,
      currentPeriodEnd: company.currentPeriodEnd,
      trialEnd: company.trialEnd,
      hasBypass,
      trial: trialStatus,
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
