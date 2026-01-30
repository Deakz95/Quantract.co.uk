import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { buildCrmContext } from "@/lib/ai/buildCrmContext";
import { CRM_ADVISOR_SYSTEM_PROMPT } from "@/lib/ai/prompts/crmAdvisor";
import { getOpenAIClient } from "@/lib/llm/openaiClient";
import type { CrmRecommendations } from "@/lib/ai/types";
import * as repo from "@/lib/server/repo";
import { getPrisma } from "@/lib/server/prisma";
import { AI_MODEL, ENGINE_MODE } from "@/lib/ai/modelConfig";
import {
  resolveAiTier,
  isHardCapExceeded,
  ALLOWANCE_REACHED_RESPONSE,
} from "@/lib/ai/providerRouting";
import {
  getCompanyAiSpendThisMonth,
  recordCompanyAiUsage,
  estimateCostPence,
  estimateCostPenceFromLength,
} from "@/lib/ai/aiUsage";

function isPaidPlan(plan: string): boolean {
  const p = plan.toLowerCase();
  return p.includes("pro") || p.includes("enterprise");
}

export const runtime = "nodejs";

// In-memory cache: keyed by "companyId:userId", TTL 10 minutes
const cache = new Map<string, { data: CrmRecommendations; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function validateShape(parsed: unknown): parsed is CrmRecommendations {
  if (!parsed || typeof parsed !== "object") return false;
  const p = parsed as Record<string, unknown>;
  if (typeof p.summary !== "string" || !p.summary) return false;
  if (!Array.isArray(p.top_recommendations)) return false;
  for (const rec of p.top_recommendations) {
    if (!rec || typeof rec !== "object") return false;
    if (typeof rec.title !== "string") return false;
    if (typeof rec.why_it_matters !== "string") return false;
    if (!Array.isArray(rec.steps_in_app)) return false;
    if (typeof rec.expected_impact !== "string") return false;
    if (typeof rec.effort !== "string") return false;
  }
  if (!Array.isArray(p.quick_wins)) return false;
  if (!Array.isArray(p.risks_or_gaps)) return false;
  if (!Array.isArray(p.questions)) return false;
  return true;
}

export async function GET() {
  try {
    const ctx = await requireCompanyContext();
    const companyId = ctx.companyId;
    const userId = ctx.userId ?? "";

    if (!companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 400 });
    }

    // 0. Check plan for paywall
    const prisma = getPrisma();
    const company = prisma
      ? await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } })
      : null;
    const plan = company?.plan ?? "trial";
    const paid = isPaidPlan(plan);

    // Free-tier: return static teaser without calling the LLM
    if (!paid) {
      const teaser: CrmRecommendations = {
        summary: "Upgrade to Pro to unlock AI-powered recommendations personalised to your CRM data, with confidence scoring and one-click apply actions.",
        top_recommendations: [
          {
            title: "Keep your client records up to date",
            why_it_matters: "Complete client profiles help you follow up faster and win more repeat work.",
            steps_in_app: ["Go to Clients", "Fill in missing contact details and site addresses"],
            expected_impact: "Better follow-up and fewer missed opportunities",
            effort: "low",
          },
          {
            title: "Send quotes promptly after enquiries",
            why_it_matters: "The faster you quote, the more likely you are to win the job — especially in competitive trades.",
            steps_in_app: ["Go to Enquiries", "Convert open enquiries to quotes"],
            expected_impact: "Higher quote-to-job conversion rate",
            effort: "low",
          },
        ],
        quick_wins: [],
        risks_or_gaps: [],
        questions: [],
      };
      return NextResponse.json({ ok: true, ...teaser, _plan: plan });
    }

    // 1. Check cache (paid only)
    const cacheKey = `${companyId}:${userId}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ ok: true, ...cached.data, _plan: plan });
    }

    // 2. Build CRM context
    const context = await buildCrmContext(companyId, userId);

    // 3. Budget gate
    const aiTier = resolveAiTier(plan);
    const spendThisMonth = await getCompanyAiSpendThisMonth(companyId);
    if (isHardCapExceeded(aiTier, spendThisMonth)) {
      return NextResponse.json({ ok: true, ...ALLOWANCE_REACHED_RESPONSE, _plan: plan });
    }

    // 4. Build prompt
    const systemPrompt = CRM_ADVISOR_SYSTEM_PROMPT.replace(
      "{{INPUT_JSON}}",
      JSON.stringify(context, null, 2),
    );
    const userContent = JSON.stringify(context);

    // 5. Call OpenAI GPT-5 mini
    const requestStart = Date.now();
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 3000,
    });
    const raw = completion.choices?.[0]?.message?.content ?? "";
    const tokensIn = completion.usage?.prompt_tokens ?? 0;
    const tokensOut = completion.usage?.completion_tokens ?? 0;
    const requestEnd = Date.now();

    // 6. Record usage
    const costPence =
      tokensIn > 0 || tokensOut > 0
        ? estimateCostPence(AI_MODEL.model, tokensIn, tokensOut)
        : estimateCostPenceFromLength(AI_MODEL.model, systemPrompt.length + userContent.length, 3000);

    recordCompanyAiUsage({
      companyId,
      userId,
      estimatedCostPence: costPence,
      requestType: "realtime_recommendations",
      tokensIn: tokensIn || undefined,
      tokensOut: tokensOut || undefined,
    });

    const tokenUsage = tokensIn || tokensOut
      ? { prompt: tokensIn, completion: tokensOut, total: tokensIn + tokensOut }
      : null;

    // 7. Parse JSON robustly
    let parsed: CrmRecommendations;
    let parseSuccess = true;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        parseSuccess = false;
        logAnalytics({ companyId, userId, durationMs: requestEnd - requestStart, tokenUsage, parseSuccess: false, rawLength: raw.length, rawPrefix: raw.slice(0, 200) });
        return NextResponse.json(
          { ok: false, error: "ai_parse_failed" },
          { status: 502 },
        );
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parseSuccess = false;
        logAnalytics({ companyId, userId, durationMs: requestEnd - requestStart, tokenUsage, parseSuccess: false, rawLength: raw.length, rawPrefix: raw.slice(0, 200) });
        return NextResponse.json(
          { ok: false, error: "ai_parse_failed" },
          { status: 502 },
        );
      }
    }

    // 8. Validate shape deeply
    if (!validateShape(parsed)) {
      logAnalytics({ companyId, userId, durationMs: requestEnd - requestStart, tokenUsage, parseSuccess: false, rawLength: raw.length, rawPrefix: raw.slice(0, 200) });
      return NextResponse.json(
        { ok: false, error: "ai_invalid_shape" },
        { status: 502 },
      );
    }

    // 9. Pick only known fields
    const result: CrmRecommendations = {
      summary: parsed.summary,
      top_recommendations: parsed.top_recommendations,
      quick_wins: parsed.quick_wins,
      risks_or_gaps: parsed.risks_or_gaps,
      questions: parsed.questions,
    };

    // 10. Analytics (engineMode only, no provider/model)
    logAnalytics({ companyId, userId, durationMs: requestEnd - requestStart, tokenUsage, parseSuccess, recCount: result.top_recommendations.length });

    // 11. Cache
    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json({ ok: true, ...result, _plan: plan });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    console.error("GET /api/admin/ai/recommendations error:", error);
    return NextResponse.json(
      { ok: false, error: "internal_error", message: String(error?.message ?? "") },
      { status: 500 },
    );
  }
}

interface AnalyticsPayload {
  companyId: string;
  userId: string;
  durationMs: number;
  tokenUsage: { prompt: number; completion: number; total: number } | null;
  parseSuccess: boolean;
  recCount?: number;
  rawLength?: number;
  rawPrefix?: string;
}

function logAnalytics(payload: AnalyticsPayload) {
  repo.recordAuditEvent({
    entityType: "company" as any,
    entityId: payload.companyId,
    action: "ai.recommendations" as any,
    actorRole: "admin",
    actor: payload.userId,
    meta: {
      engineMode: ENGINE_MODE,
      durationMs: payload.durationMs,
      tokenUsage: payload.tokenUsage,
      parseSuccess: payload.parseSuccess,
      recCount: payload.recCount ?? null,
      ...(payload.parseSuccess ? {} : { rawLength: payload.rawLength, rawPrefix: payload.rawPrefix }),
    },
  }).catch(() => {
    console.info("[ai-recs-analytics]", JSON.stringify(payload));
  });
}
