import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyContext } from "@/lib/serverAuth";
import {
  resolveAIPermissionContext,
  resolveAIMode,
} from "@/lib/ai/aiPermissionContext";
import { processAIQueryV2, type ChatMessage } from "@/lib/ai/service";
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
import { AI_MODEL } from "@/lib/ai/modelConfig";

const AskBodySchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum(["auto", "ops", "finance", "client"]).optional().default("auto"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        timestamp: z.string().optional(),
      }),
    )
    .max(6)
    .optional()
    .default([]),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Auth — get CompanyAuthContext
    const ctx = await requireCompanyContext();

    // 2. Parse & validate request body
    const body = await req.json();
    const parsed = AskBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { message, mode: requestedMode, history } = parsed.data;

    // 3. Resolve AI permission context
    const permCtx = await resolveAIPermissionContext(ctx);

    // 4. Validate mode against allowed modes
    let resolvedMode;
    try {
      resolvedMode = resolveAIMode(permCtx, requestedMode);
    } catch (err: any) {
      if (err?.status === 403) {
        return NextResponse.json(
          { error: err.message },
          { status: 403 },
        );
      }
      throw err;
    }

    // Overwrite resolvedMode in the context for downstream use
    const permCtxWithMode = {
      ...permCtx,
      resolvedMode,
    };

    // 5. Budget gate
    const spend = await getCompanyAiSpendThisMonth(ctx.companyId);
    if (isHardCapExceeded(permCtxWithMode.aiTier, spend)) {
      return NextResponse.json(
        {
          error: "ALLOWANCE_REACHED",
          ...ALLOWANCE_REACHED_RESPONSE,
        },
        { status: 429 },
      );
    }

    // 6. Convert history
    const conversationHistory: ChatMessage[] = history.map((h) => ({
      role: h.role,
      content: h.content,
      timestamp: new Date(h.timestamp || Date.now()),
    }));

    // 7. Process AI query via V2 pipeline
    const response = await processAIQueryV2(message, permCtxWithMode, conversationHistory);

    // 8. Record usage (fire-and-forget)
    const estimatedCost = estimateCostPenceFromLength(AI_MODEL.model, message.length * 10, 2048);
    recordCompanyAiUsage({
      companyId: ctx.companyId,
      userId: ctx.userId,
      estimatedCostPence: estimatedCost,
      requestType: "ask",
    });

    // 9. Derive human-readable access reason for explainability
    const accessReason = permCtxWithMode.effectiveRole === "admin"
      ? "Admin role"
      : permCtxWithMode.effectiveRole === "finance"
        ? "Finance role"
        : permCtxWithMode.hasAccountsAccess
          ? "accounts.access capability"
          : `${permCtxWithMode.effectiveRole} role`;

    // 10. Return structured response
    return NextResponse.json({
      id: crypto.randomUUID(),
      query: message,
      mode: resolvedMode,
      ...response,
      timestamp: new Date().toISOString(),
      _explain: {
        mode: resolvedMode,
        effectiveRole: permCtxWithMode.effectiveRole,
        accessReason,
        dataScope: permCtxWithMode.dataScope.isCompanyWide ? "company-wide" : "restricted",
        canSeeFinancials: permCtxWithMode.canSeeFinancials,
        restrictionCount: permCtxWithMode.restrictions.forbiddenTopics.length,
        strictness: permCtxWithMode.restrictions.strictness,
      },
    });
  } catch (error: any) {
    console.error("AI Ask Error:", error);

    if (error?.status === 401) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ error: error.message || "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        answer: "I encountered an error. Please try again.",
        confidence: 0,
        citations: [],
        suggestedActions: [],
        missingData: [],
      },
      { status: 500 },
    );
  }
}
