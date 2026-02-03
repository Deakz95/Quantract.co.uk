import { NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { revokeAppToken } from "@/lib/server/authDb";

export const runtime = "nodejs";

/**
 * POST /api/engineer/auth/logout
 * Revokes the bearer token. Session stays alive (other devices unaffected).
 * Requires Authorization: Bearer <token>.
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });
  }
  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });
  }

  await revokeAppToken(rawToken);

  return NextResponse.json({ ok: true });
});
