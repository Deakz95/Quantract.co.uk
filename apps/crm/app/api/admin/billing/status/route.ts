import { NextResponse } from "next/server";
import { requireRole, getCompanyId, getUserEmail } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { hasAdminBypass, getPlanDefinition, getTrialStatus } from "@/lib/billing/plans";

export const GET = withRequestLogging(async function GET() {
  await requireRole("admin");
  const companyId = await getCompanyId();
  const userEmail = await getUserEmail();
  const client = getPrisma();
  
  if (!client || !companyId) return NextResponse.json({
    ok: false
  }, {
    status: 400
  });
  
  const company = await client.company.findUnique({
    where: {
      id: companyId
    }
  });
  
  if (!company) return NextResponse.json({
    ok: false
  }, {
    status: 404
  });
  
  // Check if user has admin bypass - if so, treat as pro
  const hasBypass = hasAdminBypass(userEmail);
  const effectivePlan = hasBypass ? "pro" : company.plan;
  const planDef = getPlanDefinition(effectivePlan);
  const trialStatus = getTrialStatus(company.plan, company.trialStartedAt, userEmail);
  
  return NextResponse.json({
    ok: true,
    plan: effectivePlan,
    planLabel: planDef.label,
    subscriptionStatus: hasBypass ? "active" : company.subscriptionStatus,
    currentPeriodEnd: company.currentPeriodEnd,
    trialEnd: company.trialEnd,
    hasBypass,
    trial: trialStatus,
  });
});
