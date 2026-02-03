import crypto from "crypto";
import { getPrisma } from "@/lib/server/prisma";

const MAGIC_TTL_MINUTES = 15;
const PASSWORD_RESET_TTL_MINUTES = 60;
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_DAYS_REMEMBER = 90; // Extended TTL for "Keep me logged in"

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export async function upsertUserByRoleEmail(params: {
  role: "admin" | "engineer" | "client";
  email: string;
  name?: string | null;
  companyId?: string | null;
  engineerId?: string | null;
  clientId?: string | null;
}) {
  const db = getPrisma();
  const email = params.email.trim().toLowerCase();
  const now = new Date();
  return db.user.upsert({
    where: { role_email: { role: params.role, email } },
    create: {
      id: crypto.randomUUID(),
      role: params.role,
      email,
      name: params.name ?? null,
      companyId: params.companyId ?? null,
      engineerId: params.engineerId ?? null,
      clientId: params.clientId ?? null,
      updatedAt: now,
    },
    update: {
      name: params.name ?? undefined,
      companyId: params.companyId ?? undefined,
      engineerId: params.engineerId ?? undefined,
      clientId: params.clientId ?? undefined,
      updatedAt: now,
    },
  });
}

export async function findUserByRoleEmail(role: "admin" | "engineer" | "client", email: string) {
  const db = getPrisma();
  return db.user.findUnique({
    where: { role_email: { role, email: email.trim().toLowerCase() } },
  });
}

export async function createMagicLink(userId: string, ip?: string | null) {
  const db = getPrisma();
  const raw = randomToken(32);
  const tokenHash = sha256(raw);
  const expiresAt = new Date(Date.now() + MAGIC_TTL_MINUTES * 60 * 1000);
  await db.magicLinkToken.create({
    data: { id: crypto.randomUUID(), userId, tokenHash, expiresAt, ip: ip ?? null },
  });
  return { raw, expiresAt };
}

export async function validateMagicLink(tokenRaw: string) {
  const db = getPrisma();
  const tokenHash = sha256(tokenRaw);

  // First, find the token to get details and check basic validity
  const token = await db.magicLinkToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!token) return { ok: false as const, error: "Invalid link" };
  if (token.usedAt) return { ok: false as const, error: "Link already used" };
  if (token.expiresAt.getTime() < Date.now()) return { ok: false as const, error: "Link expired" };

  // Atomically mark as used - only succeeds if not already used (race-safe)
  const updated = await db.magicLinkToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // If no rows updated, another request claimed it first
  if (updated.count === 0) {
    return { ok: false as const, error: "Link already used" };
  }

  return { ok: true as const, user: token.user, tokenId: token.id };
}

export async function markMagicLinkUsed(tokenId: string) {
  // No-op: token is now marked as used atomically in validateMagicLink
}

/** @deprecated Use validateMagicLink instead - it atomically validates and consumes */
export async function consumeMagicLink(tokenRaw: string) {
  const result = await validateMagicLink(tokenRaw);
  if (!result.ok) return result;
  return { ok: true as const, user: result.user };
}

export async function findUserByEmail(email: string) {
  const db = getPrisma();
  return db.user.findFirst({
    where: { email: email.trim().toLowerCase() },
  });
}

export async function createPasswordResetToken(userId: string, ip?: string | null) {
  const db = getPrisma();
  const raw = randomToken(32);
  const tokenHash = sha256(raw);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
  await db.magicLinkToken.create({
    data: { id: crypto.randomUUID(), userId, tokenHash, expiresAt, ip: ip ?? null },
  });
  return { raw, expiresAt };
}

export async function createSession(userId: string, rememberMe: boolean = false) {
  const db = getPrisma();
  const ttlDays = rememberMe ? SESSION_TTL_DAYS_REMEMBER : SESSION_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  const session = await db.authSession.create({
    data: { id: crypto.randomUUID(), userId, expiresAt },
  });
  return session;
}

export async function revokeSession(sessionId: string) {
  const db = getPrisma();
  await db.authSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getSession(sessionId: string) {
  const db = getPrisma();
  const session = await db.authSession.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  return { ...session, user: session.user };
}

// ============================================================================
// APP TOKENS (bearer auth for mobile / Expo)
// ============================================================================

const APP_TOKEN_TTL_DAYS = 30;

export async function createAppToken(
  sessionId: string,
  opts?: { deviceName?: string; deviceId?: string },
) {
  const db = getPrisma();
  const raw = randomToken(48);
  const tokenHash = sha256(raw);
  const expiresAt = new Date(Date.now() + APP_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.appToken.create({
    data: {
      sessionId,
      tokenHash,
      expiresAt,
      deviceName: opts?.deviceName ?? null,
      deviceId: opts?.deviceId ?? null,
    },
  });
  return { raw, expiresAt };
}

/**
 * Validate a raw bearer token. Returns the linked AuthSession + User if valid.
 * Updates lastUsedAt best-effort.
 */
export async function validateAppToken(rawToken: string) {
  const db = getPrisma();
  const tokenHash = sha256(rawToken);
  const appToken = await db.appToken.findUnique({ where: { tokenHash } });
  if (!appToken) return null;
  if (appToken.revokedAt) return null;
  if (appToken.expiresAt.getTime() < Date.now()) return null;

  // Load the underlying session
  const session = await getSession(appToken.sessionId);
  if (!session) return null;

  // Best-effort lastUsedAt update (fire and forget)
  db.appToken.update({
    where: { id: appToken.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { appTokenId: appToken.id, session };
}

export async function revokeAppToken(rawToken: string) {
  const db = getPrisma();
  const tokenHash = sha256(rawToken);
  await db.appToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAppTokenById(appTokenId: string) {
  const db = getPrisma();
  await db.appToken.updateMany({
    where: { id: appTokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Rotate: revoke old token, create new one on the same session.
 * Returns the new raw token + expiry.
 */
export async function rotateAppToken(
  rawToken: string,
  opts?: { deviceName?: string; deviceId?: string },
) {
  const validated = await validateAppToken(rawToken);
  if (!validated) return null;

  // Revoke old
  await revokeAppTokenById(validated.appTokenId);

  // Issue new on same session
  const newToken = await createAppToken(validated.session.id, opts);
  return { ...newToken, session: validated.session };
}
