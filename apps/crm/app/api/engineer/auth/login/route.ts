import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { withRequestLogging } from "@/lib/server/observability";
import { findUserByRoleEmail, createSession, createAppToken } from "@/lib/server/authDb";
import { rateLimitPasswordLogin, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional().default(false),
  deviceName: z.string().max(100).optional(),
  deviceId: z.string().max(200).optional(),
});

/**
 * POST /api/engineer/auth/login
 * Mobile-only: returns a bearer token (no cookies set).
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const { email, password, rememberMe, deviceName, deviceId } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  // Rate limit (reuse existing limiter)
  const rl = rateLimitPasswordLogin(req as NextRequest, emailNorm);
  if (!rl.ok) {
    return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });
  }

  const user = await findUserByRoleEmail("engineer", emailNorm);
  if (!user || !user.passwordHash) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  // Create session + app token (no cookies)
  const session = await createSession(user.id, rememberMe);
  const appToken = await createAppToken(session.id, { deviceName, deviceId });

  return NextResponse.json({
    ok: true,
    token: appToken.raw,
    expiresAt: appToken.expiresAt.toISOString(),
  });
});
