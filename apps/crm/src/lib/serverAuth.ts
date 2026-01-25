import { getSession } from "@/lib/server/authDb";
import { hasCapability, ROLE_DEFAULTS, type Capability } from "@/lib/permissions";
import { p } from "@/lib/server/prisma";
import { neonAuth } from "@neondatabase/auth/next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export type Role = "admin" | "client" | "engineer";

// Used by middleware (Edge) for page protection only.
const ROLE_COOKIE = "qt_session_v1";
// Used by API route handlers (server) for real auth.
const SID_COOKIE = "qt_sid_v1";

const EMAIL_COOKIE = "qt_user_email";
const COMPANY_COOKIE = "qt_company_id";
const PROFILE_COOKIE = "qt_profile_complete";
const TENANT_COOKIE = "qt_tenant_subdomain";

export { getSession }; // ✅ fixes imports like: import { getSession } from "@/lib/serverAuth"

/**
 * Alias for requireRoles - allows any authenticated user
 * Used by task/checklist routes that need basic auth but no specific role
 */
export async function requireAuth() {
  return await requireRoles(["admin", "client", "engineer"]);
}

/**
 * Get the tenant subdomain from the request (set by middleware via cookie)
 */
export async function getTenantSubdomain(): Promise<string | null> {
  try {
    const jar = await cookies();
    return jar.get(TENANT_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(ROLE_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  jar.set(SID_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  jar.set(EMAIL_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  jar.set(COMPANY_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

/**
 * Backwards-compatible: sets role cookie for middleware routing + optional SID cookie for real auth.
 */
export async function setSession(role: Role, opts?: { sessionId?: string | null }) {
  const jar = await cookies();
  jar.set(ROLE_COOKIE, `role:${role}`, { httpOnly: true, sameSite: "lax", path: "/" });
  if (opts?.sessionId) {
    jar.set(SID_COOKIE, opts.sessionId, { httpOnly: true, sameSite: "lax", path: "/" });
  }
}

export async function setUserEmail(email: string) {
  const jar = await cookies();
  jar.set(EMAIL_COOKIE, email, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function setCompanyId(companyId: string) {
  const jar = await cookies();
  jar.set(COMPANY_COOKIE, companyId, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function setProfileComplete(isComplete: boolean) {
  const jar = await cookies();
  jar.set(PROFILE_COOKIE, isComplete ? "1" : "0", { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function getProfileCompleteFromCookie(): Promise<boolean | null> {
  try {
    const jar = await cookies();
    const v = jar.get(PROFILE_COOKIE)?.value;
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export async function getRoleFromCookie(): Promise<Role | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(ROLE_COOKIE)?.value || "";
    if (raw === "role:admin") return "admin";
    if (raw === "role:client") return "client";
    if (raw === "role:engineer") return "engineer";
    return null;
  } catch {
    return null;
  }
}

export async function getCompanyIdFromCookie(): Promise<string | null> {
  try {
    const jar = await cookies();
    return jar.get(COMPANY_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

export async function getEmailFromCookie(): Promise<string | null> {
  try {
    const jar = await cookies();
    return jar.get(EMAIL_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

export type AuthContext = {
  role: Role;
  email: string;
  companyId: string | null;
  userId: string;
  sessionId: string;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const jar = await cookies();
  const sid = jar.get(SID_COOKIE)?.value || "";
  if (!sid) return null;
  const session = await getSession(sid);
  if (!session) return null;
  return {
    role: session.user.role as Role,
    email: session.user.email,
    companyId: session.user.companyId ?? null,
    userId: session.user.id,
    sessionId: session.id,
  };
}

export async function requireRole(role: Role) {
  const neon = await resolveNeonSession();
  if (neon) {
    const ctx = neon as any;
    // @ts-ignore - Admin can access everything, otherwise check role match
    if (role && ctx.role !== role && ctx.role !== "admin") {
      const err: any = new Error("Forbidden"); err.status = 403; throw err;
    }
    return ctx;
  }
  const ba = await resolveBetterAuthSession();
  if (ba) {
    const ctx = ba as any;
    // @ts-ignore - Admin can access everything, otherwise check role match
    if (role && ctx.role !== role && ctx.role !== "admin") {
      const err: any = new Error("Forbidden"); err.status = 403; throw err;
    }
    return ctx;
  }

  const ctx = await getAuthContext();
  if (!ctx) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  // Admin can access everything, otherwise check role match
  if (ctx.role !== role && ctx.role !== "admin") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return ctx;
}

/**
 * ✅ Many routes call requireRoles("admin") even if only one role.
 * Supports:
 *  - requireRoles("admin")
 *  - requireRoles(["admin","engineer"])
 *
 * ADMIN UNIVERSAL ACCESS: Admin role can access all routes regardless of required roles
 */
export async function requireRoles(roles: Role | Role[]) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  // Check Neon Auth first
  const neon = await resolveNeonSession();
  if (neon && (allowed.includes(neon.role as Role) || neon.role === "admin")) {
    return neon as AuthContext;
  }

  // Check Better Auth
  const ba = await resolveBetterAuthSession();
  if (ba && (allowed.includes(ba.role as Role) || ba.role === "admin")) {
    return ba as AuthContext;
  }

  // Fall back to custom session
  const ctx = await getAuthContext();
  if (!ctx) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  // Admin can access everything, otherwise check role match
  if (!allowed.includes(ctx.role) && ctx.role !== "admin") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return ctx;
}

/** ✅ used all over API routes */
export async function getCompanyId(): Promise<string | null> {
  const ctx = await getAuthContext();
  if (ctx?.companyId) return ctx.companyId;
  return await getCompanyIdFromCookie();
}

/** ✅ used by settings/invites routes */
export async function requireCompanyId(): Promise<string> {
  const companyId = await getCompanyId();
  if (!companyId) {
    const err: any = new Error("Company not provisioned");
    err.status = 401;
    throw err;
  }
  return companyId;
}

/** ✅ used by engineer/client routes */
export async function getUserEmail(): Promise<string | null> {
  const ctx = await getAuthContext();
  if (ctx?.email) return ctx.email;
  return await getEmailFromCookie();
}


export async function requireCapability(required: Capability) {
  const ctx = await requireRole("admin"); // baseline: only admins can access these routes unless broadened later
  
  // ADMIN role has all capabilities by default - no need to check DB
  const roleKey = ctx.role.toUpperCase();
  if (ROLE_DEFAULTS[roleKey]?.includes(required)) {
    return ctx;
  }
  
  // Check for explicit permissions in database
  const prisma = p();
  try {
    const rows = await prisma.userPermission.findMany({
      where: { companyId: ctx.companyId, userId: ctx.userId, enabled: true }
    });

    const caps = rows.map((r: { key: string }) => r.key) as Capability[];
    if (!hasCapability(ctx.role, caps, required)) {
      const err: any = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
  } catch (e: any) {
    // If it's already a Forbidden error, rethrow it
    if (e?.status === 403) throw e;
    // Otherwise, DB might not be available - allow based on role defaults
    if (!ROLE_DEFAULTS[roleKey]?.includes(required)) {
      const err: any = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
  }
  
  return ctx;
}


async function resolveBetterAuthSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("better-auth.session")?.value || cookieStore.get("ba_session")?.value;
  if (!sessionToken) return null;

  // Better Auth exposes server api helpers; we call /api/better-auth/session via internal fetch.
  const res = await fetch(process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/better-auth/session` : "http://localhost:3000/api/better-auth/session", {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  }).catch(()=>null);

  if (!res || !res.ok) return null;
  const json: any = await res.json().catch(()=>null);
  const user = json?.user;
  if (!user?.email) return null;

  const prisma = p();
  const email = String(user.email).toLowerCase();
  let dbUser = await prisma.user.findFirst({ where: { email } });

  if (!dbUser) {
    const companyId = randomUUID();
    const companyName = user.name || "New Company";
    const companySlug = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30)}-${companyId.slice(0, 8)}`;

    const company = await prisma.company.create({
      data: {
        id: companyId,
        name: companyName,
        slug: companySlug,
        brandName: companyName,
        brandTagline: "",
        themePrimary: "#0f172a",
        themeAccent: "#38bdf8",
        themeBg: "#ffffff",
        themeText: "#0f172a",
        updatedAt: new Date(),
      }
    });

    const userId = randomUUID();
    dbUser = await prisma.user.create({
      data: {
        id: userId,
        email,
        name: user.name || null,
        companyId: company.id,
        role: "admin",
        updatedAt: new Date(),
      }
    });
  }

  return { userId: dbUser.id, companyId: dbUser.companyId, role: (dbUser.role || "admin") as string };
}

async function resolveNeonSession() {
  const prisma = p();
  const { user } = await neonAuth();
  if (!user) return null;

  const email = (user.email || "").toLowerCase();
  let dbUser = await prisma.user.findFirst({
    where: {
      OR: [
        { neonAuthUserId: user.id },
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (!dbUser) {
    const companyId = randomUUID();
    const companyName = user.name || "New Company";
    const companySlug = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30)}-${companyId.slice(0, 8)}`;

    const company = await prisma.company.create({
      data: {
        id: companyId,
        name: companyName,
        slug: companySlug,
        brandName: companyName,
        brandTagline: "",
        themePrimary: "#0f172a",
        themeAccent: "#38bdf8",
        themeBg: "#ffffff",
        themeText: "#0f172a",
        updatedAt: new Date(),
      },
    });

    const userId = randomUUID();
    dbUser = await prisma.user.create({
      data: {
        id: userId,
        email: email || `user-${user.id}@example.com`,
        name: user.name || null,
        companyId: company.id,
        role: "admin",
        neonAuthUserId: user.id,
        updatedAt: new Date(),
      },
    });
  } else if (!dbUser.neonAuthUserId) {
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { neonAuthUserId: user.id },
    });
  }

  return {
    userId: dbUser.id,
    companyId: dbUser.companyId,
    role: (dbUser.role || "admin") as string,
  };
}