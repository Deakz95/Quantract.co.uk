import { NextRequest, NextResponse } from "next/server";
import { getAISessionFromRequest } from "@/lib/auth/aiSession";

export async function GET(req: NextRequest) {
  const session = await getAISessionFromRequest(req);
  if (!session) return NextResponse.json({ authenticated: false, session: null });
  return NextResponse.json({ authenticated: true, session });
}
