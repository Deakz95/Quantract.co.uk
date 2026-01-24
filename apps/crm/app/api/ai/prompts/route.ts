import { NextRequest, NextResponse } from "next/server";
import { getAISessionFromRequest } from "@/lib/auth/aiSession";
import { SUGGESTED_PROMPTS } from "@/lib/ai/prompts";

export async function GET(req: NextRequest) {
  const session = await getAISessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Not authenticated", prompts: [], role: null }, { status: 401 });
  const prompts = SUGGESTED_PROMPTS[session.role] || [];
  return NextResponse.json({ prompts, role: session.role });
}
