import { NextResponse } from "next/server";

/**
 * DEPRECATED: Legacy demo login endpoint.
 *
 * This endpoint previously accepted hardcoded credentials (demo123).
 * It is disabled in production and returns 404.
 *
 * For production authentication, use:
 * - /api/auth/password/login (password-based auth)
 * - /api/auth/magic-link/request (magic link auth)
 * - /api/better-auth/* (Better Auth integration)
 */
export async function POST() {
  // In production, this legacy endpoint is disabled
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // In development, also return 404 to encourage using proper auth endpoints
  return NextResponse.json(
    { error: "Demo login disabled. Use /api/auth/password/login instead." },
    { status: 404 }
  );
}
