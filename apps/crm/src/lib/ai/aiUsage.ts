import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { AI_MODEL, ENGINE_MODE } from "./modelConfig";

export interface AiUsageRecord {
  companyId: string;
  userId: string;
  estimatedCostPence: number;
  requestType: string;
  tokensIn?: number;
  tokensOut?: number;
}

/**
 * Records an AI usage event as an audit event.
 * Fire-and-forget; never throws.
 *
 * Logs `engineMode` only — no provider or model names in analytics.
 */
export function recordCompanyAiUsage(record: AiUsageRecord): void {
  repo
    .recordAuditEvent({
      entityType: "company" as any,
      entityId: record.companyId,
      action: "ai_usage_recorded" as any,
      actorRole: "system" as any,
      actor: record.userId,
      meta: {
        engineMode: ENGINE_MODE,
        estimatedCostPence: record.estimatedCostPence,
        requestType: record.requestType,
        tokensIn: record.tokensIn ?? null,
        tokensOut: record.tokensOut ?? null,
      },
    })
    .catch((err) => {
      console.error("[ai-usage] Failed to record:", err);
    });
}

/**
 * Returns total estimatedCostPence for a company this calendar month.
 */
export async function getCompanyAiSpendThisMonth(companyId: string): Promise<number> {
  const prisma = getPrisma();
  if (!prisma) return 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const events = await prisma.auditEvent.findMany({
    where: {
      companyId,
      action: "ai_usage_recorded",
      createdAt: { gte: monthStart },
    },
    select: { meta: true },
  });

  let total = 0;
  for (const evt of events) {
    const meta = (evt.meta ?? {}) as Record<string, unknown>;
    if (typeof meta.estimatedCostPence === "number") {
      total += meta.estimatedCostPence;
    }
  }
  return total;
}

/**
 * Cost rates for the active model (pence per 1K tokens).
 */
const COST_TABLE: Record<string, { inPer1K: number; outPer1K: number }> = {
  [AI_MODEL.model]: { inPer1K: 0.015, outPer1K: 0.06 },
};

const DEFAULT_COST = { inPer1K: 0.015, outPer1K: 0.06 };

export function estimateCostPence(model: string, tokensIn: number, tokensOut: number): number {
  const rates = COST_TABLE[model] ?? DEFAULT_COST;
  const cost = (tokensIn / 1000) * rates.inPer1K + (tokensOut / 1000) * rates.outPer1K;
  return Math.ceil(cost * 100) / 100;
}

/**
 * Conservative cost estimate when token counts are unavailable.
 */
export function estimateCostPenceFromLength(model: string, promptChars: number, maxTokens: number): number {
  const estimatedInputTokens = Math.ceil(promptChars / 3.5);
  const estimatedOutputTokens = Math.ceil(maxTokens * 0.6);
  return estimateCostPence(model, estimatedInputTokens, estimatedOutputTokens);
}
