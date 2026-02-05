import { NextResponse } from "next/server";
import { withRequestLogging } from "@/lib/server/observability";
import { validateMagicLink } from "@/lib/server/authDb";
import { getPrisma } from "@/lib/server/prisma";
import { setPortalSession } from "@/lib/server/portalAuth";

/**
 * GET /api/client/magic-portal/verify?token=...
 *
 * Validates a portal magic-link token and sets a read-only portal session cookie.
 * Redirects to the client portal on success.
 *
 * Security:
 * - Token is single-use (atomically consumed by validateMagicLink)
 * - Cookie is HMAC-signed, HttpOnly, Secure, SameSite=Lax
 * - Session is scoped to companyId + clientEmail
 * - Portal session is strictly read-only
 */
export const GET = withRequestLogging(async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  if (!token) {
    return NextResponse.redirect(new URL("/client/login?error=missing_token", req.url));
  }

  // Validate and consume the magic-link token
  const result = await validateMagicLink(token);
  if (!result.ok) {
    const reason = result.error === "Invalid link" ? "invalid_token"
      : result.error === "Link expired" ? "expired"
      : result.error === "Link already used" ? "already_used"
      : "unknown";
    return NextResponse.redirect(new URL(`/client/login?error=${reason}`, req.url));
  }

  const user = result.user;

  // Resolve the client record for this user
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.redirect(new URL("/client/login?error=service_unavailable", req.url));
  }

  const client = await prisma.client.findFirst({
    where: { email: user.email.toLowerCase() },
    select: { id: true, companyId: true },
  });

  if (!client) {
    return NextResponse.redirect(new URL("/client/login?error=no_client_record", req.url));
  }

  // Set the portal session cookie (read-only, HMAC-signed)
  await setPortalSession({
    clientEmail: user.email.toLowerCase(),
    companyId: client.companyId,
    clientId: client.id,
  });

  // Redirect to client portal
  const redirectUrl = url.searchParams.get("next") || "/client";
  return NextResponse.redirect(new URL(redirectUrl, req.url));
});
