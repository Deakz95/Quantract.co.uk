import { NextResponse } from "next/server";
import { requireCompanyContext, type CompanyAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import {
  normalizePlan,
  getPlanDefinition,
  hasEntitlement,
  type OrgEntitlements,
  type Module,
  type EntitlementKey,
} from "@/lib/billing/plans";

/**
 * Server-side entitlement guard for API routes.
 *
 * Resolves the current company's entitlements and checks a specific key.
 * Returns the auth context on success, or a 403 NextResponse on failure.
 *
 * Usage:
 *   const result = await requireEntitlement("feature_schedule");
 *   if (result instanceof NextResponse) return result;
 *   const { authCtx, entitlements } = result;
 */
export async function requireEntitlement(key: EntitlementKey) {
  const authCtx = await requireCompanyContext();
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
  }

  const company = await client.company.findUnique({
    where: { id: authCtx.companyId },
    select: { plan: true },
  });

  if (!company) {
    return NextResponse.json({ ok: false, error: "company_not_found" }, { status: 404 });
  }

  const planDef = getPlanDefinition(company.plan, authCtx.email);
  const enabledModules: Module[] = [...planDef.limits.includedModules];

  const entitlements: OrgEntitlements = {
    plan: normalizePlan(company.plan),
    enabledModules,
    extraUsers: 0,
    extraEntities: 0,
    extraStorageMB: 0,
  };

  if (!hasEntitlement(entitlements, key, authCtx.email)) {
    return NextResponse.json(
      { ok: false, error: "entitlement_required", required: key },
      { status: 403 }
    );
  }

  return { authCtx, entitlements };
}
