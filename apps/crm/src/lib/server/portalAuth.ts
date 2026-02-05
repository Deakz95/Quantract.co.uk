/**
 * Portal Auth — lightweight read-only session for magic-link portal access.
 *
 * Uses HMAC-signed cookies (no extra DB table needed).
 * The portal session grants read-only access to client data:
 * certificates, documents, jobs, and timeline.
 *
 * Security:
 * - HMAC-SHA256 signed with server secret
 * - Short TTL (24 hours)
 * - Scoped to companyId + clientEmail
 * - HttpOnly, Secure, SameSite=Lax
 * - Cannot mutate any data
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PORTAL_COOKIE = IS_PRODUCTION ? "__Host-qt_portal_v1" : "qt_portal_v1";
const PORTAL_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function getPortalSecret(): string {
  const secret = process.env.PORTAL_HMAC_SECRET || process.env.AUTH_SECRET || "dev-portal-secret-change-me";
  return secret;
}

export type PortalSession = {
  clientEmail: string;
  companyId: string;
  clientId: string;
  exp: number; // Unix timestamp (seconds)
};

/**
 * Sign a portal session payload with HMAC-SHA256.
 */
function signPayload(payload: string): string {
  return createHmac("sha256", getPortalSecret()).update(payload).digest("hex");
}

/**
 * Create a portal session cookie value: base64(payload).signature
 */
function createPortalCookieValue(session: PortalSession): string {
  const payload = JSON.stringify(session);
  const encoded = Buffer.from(payload, "utf-8").toString("base64url");
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

/**
 * Parse and verify a portal session cookie value.
 * Returns null if invalid, expired, or tampered.
 */
function parsePortalCookieValue(raw: string): PortalSession | null {
  const dotIndex = raw.lastIndexOf(".");
  if (dotIndex < 1) return null;

  const encoded = raw.slice(0, dotIndex);
  const sig = raw.slice(dotIndex + 1);

  // Verify HMAC
  const expected = signPayload(encoded);
  if (sig.length !== expected.length) return null;
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  // Decode payload
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf-8");
    const session = JSON.parse(payload) as PortalSession;

    // Validate expiry
    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Validate required fields
    if (!session.clientEmail || !session.companyId || !session.clientId) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Set the portal session cookie (called after magic-link portal verify).
 */
export async function setPortalSession(session: Omit<PortalSession, "exp">): Promise<void> {
  const jar = await cookies();
  const fullSession: PortalSession = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + PORTAL_TTL_SECONDS,
  };
  const value = createPortalCookieValue(fullSession);
  jar.set(PORTAL_COOKIE, value, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: PORTAL_TTL_SECONDS,
  });
}

/**
 * Get the current portal session from cookies.
 * Returns null if no session or expired/invalid.
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(PORTAL_COOKIE)?.value;
    if (!raw) return null;
    return parsePortalCookieValue(raw);
  } catch {
    return null;
  }
}

/**
 * Clear the portal session cookie.
 */
export async function clearPortalSession(): Promise<void> {
  try {
    const jar = await cookies();
    jar.set(PORTAL_COOKIE, "", {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  } catch {
    // Ignore
  }
}

/**
 * Auth helper for client routes that accept either a full client session OR a portal session.
 *
 * Returns a normalized context with `readOnly` flag.
 * Portal sessions are ALWAYS read-only.
 * Full client sessions are read-write.
 */
export type ClientOrPortalContext = {
  clientEmail: string;
  companyId: string;
  clientId: string;
  readOnly: boolean;
};

/**
 * Require either a full client session or a portal session.
 * Throws 401 if neither is available.
 *
 * For use in client API routes that should support both authenticated clients
 * and magic-link portal viewers.
 */
export async function requireClientOrPortalSession(): Promise<ClientOrPortalContext> {
  // 1. Try full client session first
  try {
    const { requireRole, getUserEmail } = await import("@/lib/serverAuth");
    const { getPrisma } = await import("@/lib/server/prisma");
    const ctx = await requireRole("client");
    const email = (await getUserEmail()) || "";
    if (email) {
      const prisma = getPrisma();
      if (prisma) {
        const client = await prisma.client.findFirst({
          where: { email: email.toLowerCase(), companyId: ctx.companyId ?? undefined },
          select: { id: true, companyId: true },
        });
        if (client) {
          return {
            clientEmail: email.toLowerCase(),
            companyId: client.companyId,
            clientId: client.id,
            readOnly: false,
          };
        }
      }
    }
  } catch {
    // Full session not available, try portal session
  }

  // 2. Try portal session
  const portal = await getPortalSession();
  if (portal) {
    return {
      clientEmail: portal.clientEmail,
      companyId: portal.companyId,
      clientId: portal.clientId,
      readOnly: true,
    };
  }

  // 3. Neither available
  const err: any = new Error("Unauthorized");
  err.status = 401;
  throw err;
}
