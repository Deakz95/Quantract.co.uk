/**
 * AI Permission Context — capability-aware permission resolution.
 *
 * Mode controls focus/tone. Permissions control authorization.
 * `canSeeFinancials` is derived from role + capabilities, NOT from mode.
 */

import { type CompanyAuthContext, getEffectiveRole } from "@/lib/serverAuth";
import type { Role } from "@quantract/shared";
import type { Capability } from "@/lib/permissions";
import type { AiPlanTier } from "@/lib/ai/providerRouting";
import { resolveAiTier } from "@/lib/ai/providerRouting";
import { getEngineerId, getClientId, getAccessibleJobIds } from "@/lib/ai/permissions";
import { p } from "@/lib/server/prisma";

// ── Types ────────────────────────────────────────────────────────────

export type AIMode = "ops" | "finance" | "client";

export type AIPermissionContext = {
  // Identity (immutable, server-resolved)
  readonly userId: string;
  readonly companyId: string;
  readonly email: string;

  // Role & capabilities
  readonly effectiveRole: Role;
  readonly capabilities: Capability[];
  readonly hasAccountsAccess: boolean;

  // Financial authorization (derived from role + capabilities, NOT from mode)
  readonly canSeeFinancials: boolean;

  // AI mode (controls focus/tone, NOT authorization)
  readonly resolvedMode: AIMode;
  readonly allowedModes: AIMode[];

  // Data scope constraints
  readonly dataScope: {
    readonly isCompanyWide: boolean;
    readonly engineerId: string | null;
    readonly clientId: string | null;
    readonly jobIds: string[] | null;
  };

  // Restrictions
  readonly restrictions: {
    readonly forbiddenTopics: string[];
    readonly strictness: "standard" | "high";
  };

  // Plan tier (for budget enforcement)
  readonly aiTier: AiPlanTier;
};

// ── Mode resolution ──────────────────────────────────────────────────

function resolveAllowedModes(role: Role, hasAccountsAccess: boolean): AIMode[] {
  switch (role) {
    case "admin":    return ["ops", "finance", "client"];
    case "office":   return hasAccountsAccess ? ["ops", "finance"] : ["ops"];
    case "finance":  return ["finance"];
    case "engineer": return ["ops"];
    case "client":   return hasAccountsAccess ? ["finance"] : ["client"];
    default:         return ["client"];
  }
}

function resolveDefaultMode(role: Role, hasAccountsAccess: boolean): AIMode {
  switch (role) {
    case "admin":    return "ops";
    case "office":   return "ops";
    case "finance":  return "finance";
    case "engineer": return "ops";
    case "client":   return hasAccountsAccess ? "finance" : "client";
    default:         return "client";
  }
}

/**
 * Validate and resolve the requested AI mode against the user's allowed modes.
 * Throws 403 if the user requests a mode they are not allowed to use.
 */
export function resolveAIMode(
  permCtx: AIPermissionContext,
  requested?: string,
): AIMode {
  if (!requested || requested === "auto") return permCtx.resolvedMode;
  if (!permCtx.allowedModes.includes(requested as AIMode)) {
    const err: any = new Error(`Mode "${requested}" not allowed for your role`);
    err.status = 403;
    throw err;
  }
  return requested as AIMode;
}

// ── Restrictions ─────────────────────────────────────────────────────

function resolveRestrictions(
  role: Role,
  hasAccountsAccess: boolean,
): AIPermissionContext["restrictions"] {
  // External accountant: strictest
  if (role === "client" && hasAccountsAccess) {
    return {
      forbiddenTopics: [
        "job_details", "job_specifications", "job_costing",
        "engineer_assignments", "engineer_utilisation",
        "client_personal_contacts", "quotes", "certificates",
        "scheduling", "time_entries", "timesheets", "team_management",
        "expenses", "purchasing", "profitability_reports",
        "pipeline_reports", "xero_sync",
      ],
      strictness: "high",
    };
  }

  switch (role) {
    case "admin":
      return { forbiddenTopics: [], strictness: "standard" };

    case "office":
      return {
        forbiddenTopics: ["billing_management", "subscription_management", "user_permissions"],
        strictness: "standard",
      };

    case "finance":
      return {
        forbiddenTopics: ["job_creation", "engineer_assignments", "scheduling", "certificates"],
        strictness: "standard",
      };

    case "engineer":
      return {
        forbiddenTopics: [
          "financial_data", "other_engineers_data", "billing",
          "subscription", "client_contacts", "user_management",
        ],
        strictness: "standard",
      };

    case "client":
      return {
        forbiddenTopics: [
          "other_clients", "financial_internals", "team_data",
          "engineer_details", "company_settings",
        ],
        strictness: "standard",
      };

    default:
      return { forbiddenTopics: [], strictness: "high" };
  }
}

// ── Main resolver ────────────────────────────────────────────────────

/**
 * Resolve the full AI permission context from a CompanyAuthContext.
 *
 * Reuses existing auth infrastructure:
 * - `getEffectiveRole()` from serverAuth
 * - `UserPermission` query — same pattern as `requireCapability()`
 * - `getEngineerId()` / `getClientId()` / `getAccessibleJobIds()` from ai/permissions
 * - `resolveAiTier()` from ai/providerRouting
 */
export async function resolveAIPermissionContext(
  ctx: CompanyAuthContext,
): Promise<AIPermissionContext> {
  const prisma = p();
  const effectiveRole = getEffectiveRole(ctx);

  // Query capabilities from UserPermission table
  const permRows = await prisma.userPermission.findMany({
    where: { companyId: ctx.companyId, userId: ctx.userId, enabled: true },
  });
  const capabilities = permRows.map((r: { key: string }) => r.key) as Capability[];
  const hasAccountsAccess = capabilities.includes("accounts.access");

  // Financial authorization — permission-based, not mode-based
  const canSeeFinancials =
    effectiveRole === "admin" ||
    effectiveRole === "finance" ||
    hasAccountsAccess;

  // Mode resolution
  const allowedModes = resolveAllowedModes(effectiveRole, hasAccountsAccess);
  const resolvedMode = resolveDefaultMode(effectiveRole, hasAccountsAccess);

  // Data scope — reuse existing helpers via AISessionData shape
  const sessionCompat = {
    role: effectiveRole,
    companyId: ctx.companyId,
    userId: ctx.userId,
    userEmail: ctx.email,
  };

  const isCompanyWide = effectiveRole === "admin" || effectiveRole === "office";
  const engineerId = await getEngineerId(sessionCompat);
  const clientId = await getClientId(sessionCompat);

  // For company-wide users, jobIds is null (no filter); otherwise query accessible jobs
  let jobIds: string[] | null = null;
  if (!isCompanyWide) {
    jobIds = await getAccessibleJobIds(sessionCompat);
  }

  // Plan tier
  const company = await prisma.company.findUnique({
    where: { id: ctx.companyId },
    select: { plan: true },
  });
  const aiTier = resolveAiTier(company?.plan);

  // Restrictions
  const restrictions = resolveRestrictions(effectiveRole, hasAccountsAccess);

  return {
    userId: ctx.userId,
    companyId: ctx.companyId,
    email: ctx.email,
    effectiveRole,
    capabilities,
    hasAccountsAccess,
    canSeeFinancials,
    resolvedMode,
    allowedModes,
    dataScope: {
      isCompanyWide,
      engineerId,
      clientId,
      jobIds,
    },
    restrictions,
    aiTier,
  };
}
