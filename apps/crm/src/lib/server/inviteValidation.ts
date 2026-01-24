import { prisma } from "@/lib/server/prisma";

export type ValidatedInvite = {
  id: string;
  companyId: string;
  role: string;
  email: string;
  name: string | null;
  token: string;
  expiresAt: Date | null;
  usedAt: Date | null;
  createdAt: Date;
};

export type InviteValidationResult =
  | { valid: true; invite: ValidatedInvite }
  | { valid: false; error: "not_found" | "already_used" | "expired" };

/**
 * ✅ MANDATORY invite validation rules:
 * 1. 7-day expiry: invite.expiresAt must exist and be in the future
 * 2. Single-use: invite.usedAt must be null
 * 3. Email match: server uses invite.email (client cannot override)
 *
 * This helper is used by all invite verification paths to ensure consistent validation.
 */
export async function validateInviteToken(token: string): Promise<InviteValidationResult> {
  // Find invite by token
  const invite = await prisma.invite.findUnique({
    where: { token },
  });

  // Token not found
  if (!invite) {
    return { valid: false, error: "not_found" };
  }

  // Already used (single-use enforcement)
  if (invite.usedAt !== null) {
    return { valid: false, error: "already_used" };
  }

  // Expired (7-day expiry enforcement)
  if (!invite.expiresAt || invite.expiresAt.getTime() <= Date.now()) {
    return { valid: false, error: "expired" };
  }

  // Valid invite
  return {
    valid: true,
    invite,
  };
}

/**
 * Mark an invite as used. This should be called in a transaction with user creation.
 */
export async function markInviteAsUsed(inviteId: string): Promise<void> {
  await prisma.invite.update({
    where: { id: inviteId },
    data: { usedAt: new Date() },
  });
}
