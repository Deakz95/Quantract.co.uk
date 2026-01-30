import type { CrmRecommendations } from "./types";
import { AI_MODEL, ENGINE_MODE } from "./modelConfig";

// ── Plan tiers & AI budgets (pence/month) ──────────────────────────

export type AiPlanTier = "free_tier" | "pro" | "pro_plus" | "enterprise";

interface AiBudget {
  allowancePence: number;
  hardCapPence: number;
}

const AI_BUDGETS: Record<AiPlanTier, AiBudget> = {
  free_tier: { allowancePence: 0, hardCapPence: 0 },
  pro: { allowancePence: 500, hardCapPence: 700 },
  pro_plus: { allowancePence: 1500, hardCapPence: 2000 },
  enterprise: { allowancePence: 3000, hardCapPence: 4000 },
};

/**
 * Map a raw plan string from the DB to our AI tier.
 */
export function resolveAiTier(plan: string | null | undefined): AiPlanTier {
  const p = (plan ?? "").toLowerCase().trim();
  if (p.includes("enterprise")) return "enterprise";
  if (p.includes("pro_plus") || p.includes("pro-plus") || p.includes("proplus")) return "pro_plus";
  if (p.includes("pro")) return "pro";
  return "free_tier";
}

export function getAiBudget(tier: AiPlanTier): AiBudget {
  return AI_BUDGETS[tier];
}

// ── Routing result (simplified: always OpenAI GPT-5 mini) ─────────

export interface RoutingResult {
  provider: "openai";
  model: string;
  engineMode: string;
}

/**
 * Returns the single global AI configuration.
 * All routing, escalation, and fallback logic has been removed.
 */
export function routeProvider(): RoutingResult {
  return {
    provider: AI_MODEL.provider,
    model: AI_MODEL.model,
    engineMode: ENGINE_MODE,
  };
}

// ── Hard cap / allowance-reached response ──────────────────────────

export const ALLOWANCE_REACHED_RESPONSE: CrmRecommendations = {
  summary:
    "You've reached your monthly Smart Assistant allowance. " +
    "Your allowance resets at the start of next month. " +
    "In the meantime, here are some evergreen tips.",
  top_recommendations: [
    {
      title: "Review your open enquiries",
      why_it_matters: "Following up on enquiries quickly improves your win rate.",
      steps_in_app: ["Go to Enquiries", "Filter by status: Open", "Follow up or convert to quotes"],
      expected_impact: "Higher conversion from enquiry to job",
      effort: "low",
    },
    {
      title: "Chase unpaid invoices",
      why_it_matters: "Overdue invoices hurt cash flow — chasing them early makes a big difference.",
      steps_in_app: ["Go to Invoices", "Filter by status: Unpaid", "Send a reminder or mark as paid"],
      expected_impact: "Improved cash flow",
      effort: "low",
    },
  ],
  quick_wins: [],
  risks_or_gaps: [],
  questions: [],
};

/**
 * Check whether the hard cap has been exceeded for a tier.
 */
export function isHardCapExceeded(tier: AiPlanTier, spendPence: number): boolean {
  return spendPence >= AI_BUDGETS[tier].hardCapPence;
}
