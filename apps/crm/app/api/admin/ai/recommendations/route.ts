import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { buildCrmContext } from "@/lib/ai/buildCrmContext";
import { CRM_ADVISOR_SYSTEM_PROMPT } from "@/lib/ai/prompts/crmAdvisor";
import { getOpenAIClient, DEFAULT_MODEL } from "@/lib/llm/openaiClient";
import type { CrmRecommendations } from "@/lib/ai/types";

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

    // 0. Check cache
    const cacheKey = `${companyId}:${userId}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ ok: true, ...cached.data });
    }

    // 1. Build CRM context
    const context = await buildCrmContext(companyId, userId);

    // 2. Build prompt — replace placeholder with context JSON
    const systemPrompt = CRM_ADVISOR_SYSTEM_PROMPT.replace(
      "{{INPUT_JSON}}",
      JSON.stringify(context, null, 2),
    );

    // 3. Call AI
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(context) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 3000,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";

    // 4. Parse JSON robustly
    let parsed: CrmRecommendations;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try extracting first {...} block
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json(
          { ok: false, error: "ai_parse_failed" },
          { status: 502 },
        );
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return NextResponse.json(
          { ok: false, error: "ai_parse_failed" },
          { status: 502 },
        );
      }
    }

    // 5. Validate shape deeply
    if (!validateShape(parsed)) {
      return NextResponse.json(
        { ok: false, error: "ai_invalid_shape" },
        { status: 502 },
      );
    }

    // 6. Pick only known fields (prevent leaking unexpected AI output)
    const result: CrmRecommendations = {
      summary: parsed.summary,
      top_recommendations: parsed.top_recommendations,
      quick_wins: parsed.quick_wins,
      risks_or_gaps: parsed.risks_or_gaps,
      questions: parsed.questions,
    };

    // 7. Cache
    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json({ ok: true, ...result });
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
