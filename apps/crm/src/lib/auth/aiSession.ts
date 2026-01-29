import { requireCompanyContext, type Role } from "@/lib/serverAuth";

// Use Role from serverAuth for consistency
export type AIRole = Role;

export type AISessionData = {
  role: AIRole;
  companyId?: string;
  userId?: string;
  userEmail?: string;
};

export async function getAISessionFromRequest(_req?: Request): Promise<AISessionData | null> {
  try {
    const ctx = await requireCompanyContext();
    return {
      role: ctx.role as AIRole,
      companyId: ctx.companyId,
      userId: ctx.userId,
      userEmail: ctx.email,
    };
  } catch {
    return null;
  }
}
