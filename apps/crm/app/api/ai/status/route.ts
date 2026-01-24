import { NextResponse } from "next/server";
import { isAIAvailable } from "@/lib/ai/service";

export async function GET() {
  const configured = isAIAvailable();
  return NextResponse.json({
    configured,
    message: configured ? "AI assistant is ready" : "OPENAI_API_KEY not configured.",
  });
}
