import { NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { rotateAppToken } from "@/lib/server/authDb";

export const runtime = "nodejs";

/**
 * POST /api/engineer/auth/rotate
 * Rotates the bearer token: revokes old, issues new on the same session.
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

  const result = await rotateAppToken(rawToken);
  if (!result) {
    return NextResponse.json({ ok: false, error: "invalid_or_expired_token" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    token: result.raw,
    expiresAt: result.expiresAt.toISOString(),
  });
});
