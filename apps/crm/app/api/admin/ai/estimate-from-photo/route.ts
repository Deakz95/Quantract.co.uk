import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getOpenAIClient } from "@/lib/llm/openaiClient";
import { AI_MODEL } from "@/lib/ai/modelConfig";
import { getPrisma } from "@/lib/server/prisma";
import {
  resolveAiTier,
  isHardCapExceeded,
  ALLOWANCE_REACHED_RESPONSE,
} from "@/lib/ai/providerRouting";
import {
  getCompanyAiSpendThisMonth,
  recordCompanyAiUsage,
  estimateCostPenceFromLength,
} from "@/lib/ai/aiUsage";
import { withRequestLogging } from "@/lib/server/observability";
import { isFeatureEnabled } from "@/lib/server/featureFlags";
import { rateLimit, getClientIp } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a UK electrical/plumbing/HVAC trade estimator AI. Given a photo description or image of a job site, provide a rough cost and time estimate.

Return ONLY valid JSON in this format:
{
  "summary": "Brief description of work identified",
  "imageSummary": "Description of what was seen in the photo and why it led to this estimate (omit if no photo)",
  "tradeCategory": "electrical|plumbing|hvac|general",
  "lineItems": [
    { "description": "Item description", "qty": 1, "unit": "each", "labourHours": 2, "materialCost": 50, "labourCost": 80 }
  ],
  "totalMaterialCost": 50,
  "totalLabourCost": 80,
  "totalCost": 130,
  "totalHours": 2,
  "confidence": "low|medium|high",
  "assumptions": ["List of assumptions made"],
  "caveats": ["Any important caveats"]
}

Use UK pricing. Labour rate ~£40/hr for standard work, £55/hr for specialist. All costs in GBP. Be conservative with estimates.`;

async function fetchQualityHistory(companyId: string, tradeHint: string | undefined) {
  const prisma = getPrisma();
  if (!prisma) return [];

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const where: any = {
    companyId,
    confidence: { in: ["high", "medium"] },
    totalCost: { not: null },
    createdAt: { gte: ninetyDaysAgo },
  };
  if (tradeHint) where.tradeCategory = tradeHint;

  try {
    const rows = await prisma.aiEstimate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { description: true, totalCost: true, confidence: true, estimateJson: true },
    });
    return rows;
  } catch {
    return [];
  }
}

function buildHistoryContext(history: any[]): string {
  if (!history.length) return "";
  const examples = history.map((h: any, i: number) => {
    const est = h.estimateJson as any;
    const items = Array.isArray(est?.lineItems)
      ? est.lineItems.map((li: any) => `  - ${li.description}: £${li.labourCost + li.materialCost}`).join("\n")
      : "";
    return `Example ${i + 1} (${h.confidence} confidence, £${h.totalCost}):\nDescription: ${h.description || "N/A"}\n${items}`;
  }).join("\n\n");
  return `\n\nHere are recent similar estimates from this company for pricing guidance:\n${examples}\n\nUse these as reference but adjust for the specific job described.`;
}

function guessTradeCategory(description: string): string | undefined {
  const d = description.toLowerCase();
  if (/rewire|socket|light|consumer unit|rcd|mcb|cable|wiring|circuit|fuse|eicr|eic|elec/i.test(d)) return "electrical";
  if (/plumb|pipe|boiler|radiator|tap|toilet|bath|shower|drain|water/i.test(d)) return "plumbing";
  if (/hvac|heating|ventilat|air con|heat pump|duct/i.test(d)) return "hvac";
  return "general";
}

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Rate limit: 10 requests/min per IP
    const ip = getClientIp(req);
    const rl = rateLimit({ key: `ai-estimate:${ip}`, limit: 10, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: "rate_limit_exceeded" }, { status: 429 });
    }

    const prisma = getPrisma();
    const company = prisma
      ? await prisma.company.findUnique({ where: { id: authCtx.companyId }, select: { plan: true } })
      : null;
    const plan = company?.plan ?? "trial";

    // Feature flag check
    if (!isFeatureEnabled(plan, "ai_estimator_photo")) {
      return NextResponse.json({ ok: false, error: "feature_not_available", upgrade: true }, { status: 403 });
    }

    const tier = resolveAiTier(plan);
    const spend = await getCompanyAiSpendThisMonth(authCtx.companyId);
    if (isHardCapExceeded(tier, spend)) {
      return NextResponse.json(ALLOWANCE_REACHED_RESPONSE, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.description && !body?.imageBase64) {
      return NextResponse.json({ ok: false, error: "description or imageBase64 required" }, { status: 400 });
    }

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json({ ok: false, error: "ai_unavailable" }, { status: 503 });
    }

    // Guess trade category from description for history lookup
    const tradeHint = body.description ? guessTradeCategory(body.description) : undefined;

    // Fetch quality-gated historical estimates
    const history = await fetchQualityHistory(authCtx.companyId, tradeHint);
    const historyContext = buildHistoryContext(history);

    const systemPrompt = SYSTEM_PROMPT + historyContext;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (body.imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: body.description || "Please estimate the work shown in this photo." },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${body.imageBase64}` } },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Please estimate the following job:\n\n${body.description}`,
      });
    }

    const modelId = AI_MODEL.model;

    const completion = await openai.chat.completions.create({
      model: modelId,
      messages,
      max_tokens: 2000,
      temperature: 0.3,
    });

    const content = completion.choices?.[0]?.message?.content || "";

    // Track AI usage
    const promptText = messages.map((m: any) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)).join("");
    const costPence = estimateCostPenceFromLength(modelId, promptText.length, 2000);
    recordCompanyAiUsage({
      companyId: authCtx.companyId,
      userId: authCtx.userId ?? "system",
      estimatedCostPence: costPence,
      requestType: "estimate-from-photo",
      tokensIn: Math.ceil(promptText.length / 3.5),
      tokensOut: Math.ceil(content.length / 3.5),
    });

    // Parse JSON from response
    let estimate;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      estimate = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      estimate = null;
    }

    if (!estimate) {
      return NextResponse.json({ ok: true, data: { raw: content, parsed: false } });
    }

    // Auto-save estimate to AiEstimate table
    let estimateId: string | undefined;
    if (prisma) {
      try {
        const saved = await prisma.aiEstimate.create({
          data: {
            companyId: authCtx.companyId,
            userId: authCtx.userId ?? null,
            description: body.description || null,
            imageSummary: estimate.imageSummary || null,
            estimateJson: estimate,
            confidence: estimate.confidence || "low",
            tradeCategory: estimate.tradeCategory || tradeHint || null,
            totalCost: typeof estimate.totalCost === "number" ? estimate.totalCost : null,
          },
        });
        estimateId = saved.id;
      } catch (e) {
        console.error("[ai-estimate] Failed to save estimate:", e);
      }
    }

    return NextResponse.json({ ok: true, data: { estimate, parsed: true, estimateId } });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[POST /api/admin/ai/estimate-from-photo]", e);
    return NextResponse.json({ ok: false, error: "estimate_failed" }, { status: 500 });
  }
});
