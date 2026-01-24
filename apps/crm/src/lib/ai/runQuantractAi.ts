import { getOpenAIClient, DEFAULT_MODEL } from "@/lib/llm/openaiClient";
import { AiResponseSchema, type AiResponse } from "@/lib/ai/responseSchema";

export async function runQuantractAi(args: { system: string; user: string; dataBundle: unknown }): Promise<AiResponse> {
  const openai = getOpenAIClient();
  const res = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: JSON.stringify({ question: args.user, data: args.dataBundle }) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 2048,
  });

  const text = res.choices[0]?.message?.content ?? "{}";

  try {
    const jsonResponse = JSON.parse(text);
    const parsed = AiResponseSchema.safeParse(jsonResponse);
    if (parsed.success) return parsed.data;
    return {
      answer: String(jsonResponse.answer || jsonResponse.response || text),
      confidence: typeof jsonResponse.confidence === "number" ? jsonResponse.confidence : 0.6,
      citations: Array.isArray(jsonResponse.citations) ? jsonResponse.citations.slice(0, 20) : [],
      suggestedActions: Array.isArray(jsonResponse.suggestedActions) ? jsonResponse.suggestedActions.slice(0, 10) : [],
      missingData: Array.isArray(jsonResponse.missingData) ? jsonResponse.missingData : [],
    };
  } catch {
    return { answer: text, confidence: 0.4, citations: [], suggestedActions: [], missingData: [] };
  }
}
