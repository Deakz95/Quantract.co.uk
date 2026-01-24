import { getPrisma } from "@/lib/server/prisma";
import type { AISessionData } from "@/lib/auth/aiSession";
import { SYSTEM_PROMPTS } from "@/lib/ai/prompts";
import { runQuantractAi } from "@/lib/ai/runQuantractAi";
import { buildAiContext, type AiDataBundle } from "@/lib/ai/dataAccess";
import { validateCitations, InvalidCitationError } from "@/lib/ai/validateCitations";
import type { AiResponse } from "@/lib/ai/responseSchema";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function isAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

const MAX_RETRIES = 1;

export async function processAIQuery(query: string, session: AISessionData, conversationHistory: ChatMessage[] = []): Promise<AiResponse & { error?: string }> {
  if (!isAIAvailable()) {
    return {
      answer: "AI not configured. Set OPENAI_API_KEY.",
      confidence: 0,
      citations: [],
      suggestedActions: [],
      missingData: ["OPENAI_API_KEY"],
      error: "LLM_NOT_CONFIGURED",
    };
  }

  // If Prisma isn't configured, we can't safely build context.
  if (!getPrisma()) {
    return {
      answer: "AI requires the database to be configured (DATABASE_URL).",
      confidence: 0,
      citations: [],
      suggestedActions: [],
      missingData: ["DATABASE_URL"],
      error: "PRISMA_NOT_CONFIGURED",
    };
  }

  try {
    const bundle = await buildAiContext(session);

    const baseSystemPrompt = `${SYSTEM_PROMPTS[session.role]}

CITATION RULES (CRITICAL):
1) Use ONLY provided data. Never invent.
2) Citations MUST use the exact record 'id' field (uuid).
3) JSON output must match:
{"answer":"...","confidence":0-1,"citations":[{"entityType":"JOB|QUOTE|INVOICE|VARIATION|TIME_ENTRY|TIMESHEET|CERTIFICATE|AUDIT","entityId":"uuid","note":"..."}],"suggestedActions":[],"missingData":[]}

User context: role=${session.role} companyId=${session.companyId ?? "null"} email=${session.userEmail ?? "null"}`;

    const historyContext = conversationHistory
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const buildUserMessage = (extraSystemNote?: string) => {
      const core = historyContext ? `Previous:\n${historyContext}\n\nQuestion: ${query}` : query;
      return extraSystemNote ? `${core}\n\nSYSTEM NOTE: ${extraSystemNote}` : core;
    };

    let retries = 0;
    let lastInvalid: InvalidCitationError | null = null;

    while (true) {
      const extra = lastInvalid
        ? `Your last answer had invalid citations: ${JSON.stringify(lastInvalid.invalidCitations)}. Regenerate the answer using only IDs present in the provided data.`
        : undefined;

      const aiResponse = await runQuantractAi({
        system: baseSystemPrompt,
        user: buildUserMessage(extra),
        dataBundle: stripValidIds(bundle),
      });

      try {
        validateCitations(aiResponse, bundle);
        await logAI(session, query, aiResponse);
        return aiResponse;
      } catch (err) {
        if (err instanceof InvalidCitationError && retries < MAX_RETRIES) {
          retries++;
          lastInvalid = err;
          continue;
        }
        throw err;
      }
    }
  } catch (error) {
    console.error("AI error:", error);
    const msg = error instanceof InvalidCitationError ? "Response contained invalid references. Please try again." : "Error processing request.";
    return {
      answer: msg,
      confidence: 0,
      citations: [],
      suggestedActions: [],
      missingData: [],
      error: error instanceof Error ? error.message : "Unknown",
    };
  }
}

function stripValidIds(bundle: AiDataBundle): Omit<AiDataBundle, "validEntityIds"> {
  const { validEntityIds, ...rest } = bundle;
  return rest;
}

async function logAI(session: AISessionData, query: string, response: AiResponse): Promise<void> {
  try {
    const client = getPrisma();
    if (!client || !session.companyId) return;
    await client.auditEvent.create({
      data: {
        companyId: session.companyId,
        entityType: "AI",
        entityId: session.userEmail || session.role,
        action: "ai.query",
        actorRole: session.role,
        actor: session.userEmail,
        meta: {
          query: query.substring(0, 2000),
          confidence: response.confidence,
        },
      },
    });
  } catch {
    // non-fatal
  }
}
