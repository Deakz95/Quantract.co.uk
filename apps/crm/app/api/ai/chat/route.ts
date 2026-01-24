import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processAIQuery, type ChatMessage } from "@/lib/ai/service";
import { getAISessionFromRequest } from "@/lib/auth/aiSession";

const ChatBodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        timestamp: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getAISessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ChatBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.format() }, { status: 400 });
    }

    const { message, history } = parsed.data;
    const conversationHistory: ChatMessage[] = history.map((h) => ({
      role: h.role,
      content: h.content,
      timestamp: new Date(h.timestamp || Date.now()),
    }));

    const response = await processAIQuery(message, session, conversationHistory);

    return NextResponse.json({
      id: crypto.randomUUID(),
      query: message,
      ...response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        answer: "I encountered an error. Please try again.",
        confidence: 0,
        citations: [],
        suggestedActions: [],
        missingData: [],
      },
      { status: 500 }
    );
  }
}
