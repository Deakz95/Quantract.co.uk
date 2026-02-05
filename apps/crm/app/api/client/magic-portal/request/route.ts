import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { withRequestLogging } from "@/lib/server/observability";
import { getPrisma } from "@/lib/server/prisma";
import { randomToken, sha256 } from "@/lib/server/authDb";
import { sendMagicLinkEmail, absoluteUrl } from "@/lib/server/email";
import { rateLimitMagicLink, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";
import crypto from "crypto";

const schema = z.object({
  email: z.string().email(),
});

const PORTAL_TOKEN_TTL_MINUTES = 15;

/**
 * POST /api/client/magic-portal/request
 *
 * Sends a portal magic link to the given email address.
 * The link grants read-only access to the client portal (certificates, documents, jobs)
 * without requiring a full account or password.
 *
 * Rate limited: AUTH_MAGIC_LINK tier (5/15min per IP + email).
 * Does not leak email existence (always returns ok: true).
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  // Rate limiting
  const rl = rateLimitMagicLink(req as NextRequest, email);
  if (!rl.ok) {
    return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });
  }

  const prisma = getPrisma();
  if (!prisma) {
    // Don't leak DB availability — return ok
    return NextResponse.json({ ok: true });
  }

  // Find the client record by email
  const client = await prisma.client.findFirst({
    where: { email },
    select: { id: true, companyId: true, name: true },
  });

  // Don't leak existence — always return ok
  if (!client) {
    return NextResponse.json({ ok: true });
  }

  // Create a portal-scoped token (reuse MagicLinkToken with a portal user convention)
  // We need a User record. Find or create a client user.
  let user = await prisma.user.findFirst({
    where: { email, role: "client" },
    select: { id: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        role: "client",
        companyId: client.companyId,
        clientId: client.id,
        updatedAt: new Date(),
      },
    });
  }

  // Create magic link token
  const raw = randomToken(32);
  const tokenHash = sha256(raw);
  const expiresAt = new Date(Date.now() + PORTAL_TOKEN_TTL_MINUTES * 60 * 1000);
  await prisma.magicLinkToken.create({
    data: { id: crypto.randomUUID(), userId: user.id, tokenHash, expiresAt },
  });

  // Build portal verify URL
  const verifyUrl = absoluteUrl(`/api/client/magic-portal/verify?token=${raw}`);

  try {
    await sendMagicLinkEmail({
      to: email,
      verifyLink: verifyUrl,
    });
  } catch (emailErr) {
    console.error("[magic-portal/request] Failed to send email:", emailErr);
  }

  return NextResponse.json({ ok: true });
});
