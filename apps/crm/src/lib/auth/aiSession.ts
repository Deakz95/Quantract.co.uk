import { neonAuth } from "@neondatabase/auth/next/server";
import { getAuthContext, type Role } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";

// Use Role from serverAuth for consistency
export type AIRole = Role;

export type AISessionData = {
  role: AIRole;
  companyId?: string;
  userId?: string;
  userEmail?: string;
};

export async function getAISessionFromRequest(_req?: Request): Promise<AISessionData | null> {
  // First try to get full auth context with companyId
  const authCtx = await getAuthContext();
  if (authCtx && authCtx.companyId) {
    return {
      role: authCtx.role as AIRole,
      companyId: authCtx.companyId,
      userId: authCtx.userId,
      userEmail: authCtx.email,
    };
  }

  // Fallback to neonAuth
  const { user } = await neonAuth();
  if (!user) return null;

  // Look up companyId from database using email
  const email = user?.email?.toLowerCase();
  if (email) {
    const client = getPrisma();
    if (client) {
      const companyUser = await client.companyUser.findFirst({
        where: { email },
        select: { companyId: true, role: true, id: true },
      }).catch(() => null);

      if (companyUser) {
        return {
          role: (companyUser.role || "admin") as AIRole,
          companyId: companyUser.companyId,
          userId: companyUser.id,
          userEmail: email,
        };
      }
    }
  }

  return {
    role: "admin",
    userEmail: email ?? undefined,
  };
}
