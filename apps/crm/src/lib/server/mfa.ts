/**
 * MFA (Multi-Factor Authentication) Helpers
 *
 * TOTP-based MFA implementation (design-ready, not actively enforced)
 * - Provides schema and auth flow hooks for future MFA enablement
 * - No UI implementation required yet
 * - No database migration needed when activating
 */

import crypto from "crypto";
import { getPrisma } from "@/lib/server/prisma";

const MFA_CHALLENGE_TTL_MINUTES = 5;

/**
 * Convert buffer to base32 (RFC4648)
 * Node Buffer doesn't support base32, so we implement it here
 */
function toBase32(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Generate a random TOTP secret (32 characters base32)
 * Future: use authenticator apps like Google Authenticator
 */
export function generateMfaSecret(): string {
  const buffer = crypto.randomBytes(20);
  return toBase32(buffer).replace(/=/g, "");
}

/**
 * Generate backup codes for MFA recovery
 * Returns array of 10 random 8-character codes
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Hash backup codes before storing
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.toLowerCase()).digest("hex");
}

/**
 * Create MFA challenge session
 * Used after initial auth but before granting full access
 */
export async function createMfaChallenge(params: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const db = getPrisma();
  const challengeToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MFA_CHALLENGE_TTL_MINUTES * 60 * 1000);

  const mfaSession = await db.mfaSession.create({
    data: {
      userId: params.userId,
      challengeToken,
      expiresAt,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      status: "pending",
    },
  });

  return { challengeToken, expiresAt, mfaSessionId: mfaSession.id };
}

/**
 * Verify MFA challenge token is valid
 */
export async function getMfaChallenge(challengeToken: string) {
  const db = getPrisma();
  const session = await db.mfaSession.findUnique({
    where: { challengeToken },
    include: { User: true },
  });

  if (!session) return { ok: false as const, error: "Invalid challenge" };
  if (session.status !== "pending") return { ok: false as const, error: "Challenge already used" };
  if (session.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, error: "Challenge expired" };
  }

  return { ok: true as const, session: { ...session, user: session.User } };
}

/**
 * Mark MFA challenge as verified
 */
export async function verifyMfaChallenge(challengeToken: string) {
  const db = getPrisma();
  const result = await getMfaChallenge(challengeToken);
  if (!result.ok) return result;

  await db.mfaSession.update({
    where: { id: result.session.id },
    data: {
      status: "verified",
      verifiedAt: new Date(),
    },
  });

  // Update user's last MFA verification timestamp
  await db.user.update({
    where: { id: result.session.userId },
    data: { mfaVerifiedAt: new Date() },
  });

  return { ok: true as const, userId: result.session.userId };
}

/**
 * Check if user has MFA enabled
 */
export async function checkMfaRequired(userId: string): Promise<boolean> {
  const db = getPrisma();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true, mfaRequiredBy: true },
  });

  if (!user) return false;

  // MFA is required if:
  // 1. User has voluntarily enabled it, OR
  // 2. Company has enforced MFA by a deadline (future feature)
  if (user.mfaEnabled) return true;
  if (user.mfaRequiredBy && user.mfaRequiredBy.getTime() < Date.now()) return true;

  return false;
}

/**
 * Enroll user in MFA
 * Future: integrate with TOTP libraries like otplib
 */
export async function enrollMfa(userId: string) {
  const db = getPrisma();
  const secret = generateMfaSecret();
  const backupCodes = generateBackupCodes();
  const hashedCodes = backupCodes.map(hashBackupCode);

  await db.user.update({
    where: { id: userId },
    data: {
      mfaSecret: secret, // TODO: Encrypt this in production
      mfaBackupCodes: JSON.stringify(hashedCodes),
      mfaEnrolledAt: new Date(),
      mfaEnabled: false, // Will be enabled after verification
    },
  });

  return { secret, backupCodes };
}

/**
 * Verify backup code and consume it
 */
export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const db = getPrisma();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { mfaBackupCodes: true },
  });

  if (!user || !user.mfaBackupCodes) return false;

  const codes = JSON.parse(user.mfaBackupCodes) as string[];
  const hashedInput = hashBackupCode(code);

  const index = codes.indexOf(hashedInput);
  if (index === -1) return false;

  // Remove used code
  codes.splice(index, 1);
  await db.user.update({
    where: { id: userId },
    data: { mfaBackupCodes: JSON.stringify(codes) },
  });

  return true;
}

/**
 * Auth flow hook: Check if MFA verification needed after password/magic link auth
 * Returns true if MFA challenge should be created instead of session
 */
export async function shouldRequireMfa(userId: string): Promise<boolean> {
  return checkMfaRequired(userId);
}

/**
 * Clean up expired MFA challenges (run via cron)
 */
export async function cleanupExpiredMfaChallenges() {
  const db = getPrisma();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  const result = await db.mfaSession.updateMany({
    where: {
      status: "pending",
      expiresAt: { lt: cutoff },
    },
    data: {
      status: "expired",
    },
  });

  return result.count;
}
