import { getSession, validateAppToken } from "@/lib/server/authDb";
import { hasCapability, ROLE_DEFAULTS, type Capability } from "@/lib/permissions";
import { p } from "@/lib/server/prisma";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { timeStart, logPerf } from "@/lib/perf/timing";
import { type Role, ALL_ROLES } from "@quantract/shared";

// Lazy-initialized Neon Auth instance (createNeonAuth replaced the old neonAuth export)
let _neonAuthInstance: ReturnType<typeof createNeonAuth> | null = null;
function getNeonAuthInstance() {
  if (!_neonAuthInstance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL || process.env.NEON_AUTH_URL || "";
    const secret = process.env.NEON_AUTH_COOKIE_SECRET || "x".repeat(32);
    if (!baseUrl) return null;
    _neonAuthInstance = createNeonAuth({ baseUrl, cookies: { secret } });
  }
  return _neonAuthInstance;
}

/**
 * Compatibility wrapper: replaces the removed `neonAuth()` export from @neondatabase/auth.
 * Returns { user } by calling createNeonAuth().getSession().
 */
export async function neonAuth(): Promise<{ user: any }> {
  const instance = getNeonAuthInstance();
  if (!instance) return { user: null };
  try {
    const { data } = await instance.getSession();
    return { user: data?.user ?? null };
  } catch {
    return { user: null };
  }
}

export type { Role };


// ============================================================================
// COOKIE CONFIGURATION - Centralized security settings
// ============================================================================

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Cookie names - using __Host- prefix in production for maximum security.
 * __Host- prefix requirements: Secure, no Domain, Path=/.
 * This prevents cookie injection attacks via subdomains.
 */
const ROLE_COOKIE = IS_PRODUCTION ? "__Host-qt_session_v1" : "qt_session_v1";
const SID_COOKIE = IS_PRODUCTION ? "__Host-qt_sid_v1" : "qt_sid_v1";
const EMAIL_COOKIE = IS_PRODUCTION ? "__Host-qt_user_email" : "qt_user_email";
const COMPANY_COOKIE = IS_PRODUCTION ? "__Host-qt_company_id" : "qt_company_id";
const PROFILE_COOKIE = IS_PRODUCTION ? "__Host-qt_profile_complete" : "qt_profile_complete";
// Tenant cookie cannot use __Host- because it may need to work across subdomains
const TENANT_COOKIE = "qt_tenant_subdomain";

/**
 * Centralized secure cookie options generator.
 * Ensures consistent security settings across all auth cookies.
 *
 * @param maxAge - Cookie lifetime in seconds. Default: 7 days (604800s)
 */
export function getSecureCookieOptions(maxAge: number = 60 * 60 * 24 * 7): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION, // Always secure in production (Render terminates TLS)
    sameSite: "lax",       // Protects against CSRF while allowing normal navigation
    path: "/",             // Required for __Host- prefix
    maxAge,
  };
}

/**
 * Cookie options for clearing/expiring a cookie
 */
function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export { getSession }; // ✅ fixes imports like: import { getSession } from "@/lib/serverAuth"

export { ALL_ROLES };

/**
 * Alias for requireRoles - allows any authenticated user
 * Used by task/checklist routes that need basic auth but no specific role
 */
export async function requireAuth() {
  return await requireRoles(ALL_ROLES);
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
  const clearOpts = getClearCookieOptions();
  jar.set(ROLE_COOKIE, "", clearOpts);
  jar.set(SID_COOKIE, "", clearOpts);
  jar.set(EMAIL_COOKIE, "", clearOpts);
  jar.set(COMPANY_COOKIE, "", clearOpts);
  jar.set(PROFILE_COOKIE, "", clearOpts);
  // Clear Neon Auth / Better Auth cookies to prevent split-brain state
  jar.set("better-auth.session", "", clearOpts);
  jar.set("ba_session", "", clearOpts);
  jar.set("__Secure-authjs.session-token", "", clearOpts);
  jar.set("authjs.session-token", "", clearOpts);
  // Purge auth context cache so stale entries don't survive logout
  _authCache.clear();
}

/**
 * Backwards-compatible: sets role cookie for middleware routing + optional SID cookie for real auth.
 */
export async function setSession(role: Role, opts?: { sessionId?: string | null }) {
  const jar = await cookies();
  const cookieOpts = getSecureCookieOptions();
  jar.set(ROLE_COOKIE, `role:${role}`, cookieOpts);
  if (opts?.sessionId) {
    jar.set(SID_COOKIE, opts.sessionId, cookieOpts);
  }
}

export async function setUserEmail(email: string) {
  const jar = await cookies();
  jar.set(EMAIL_COOKIE, email, getSecureCookieOptions());
}

export async function setCompanyId(companyId: string) {
  const jar = await cookies();
  jar.set(COMPANY_COOKIE, companyId, getSecureCookieOptions());
}

export async function setProfileComplete(isComplete: boolean) {
  const jar = await cookies();
  jar.set(PROFILE_COOKIE, isComplete ? "1" : "0", getSecureCookieOptions());
}

export async function getProfileCompleteFromCookie(): Promise<boolean | null> {
  try {
    const jar = await cookies();
    // Check both prefixed and non-prefixed for migration compatibility
    const v = jar.get(PROFILE_COOKIE)?.value ?? jar.get("qt_profile_complete")?.value;
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
    // Check both prefixed and non-prefixed for migration compatibility
    const raw = jar.get(ROLE_COOKIE)?.value || jar.get("qt_session_v1")?.value || "";
    if (raw === "role:admin") return "admin";
    if (raw === "role:office") return "office";
    if (raw === "role:finance") return "finance";
    if (raw === "role:engineer") return "engineer";
    if (raw === "role:client") return "client";
    return null;
  } catch {
    return null;
  }
}

export async function getCompanyIdFromCookie(): Promise<string | null> {
  try {
    const jar = await cookies();
    // Check both prefixed and non-prefixed for migration compatibility
    return jar.get(COMPANY_COOKIE)?.value || jar.get("qt_company_id")?.value || null;
  } catch {
    return null;
  }
}

export async function getEmailFromCookie(): Promise<string | null> {
  try {
    const jar = await cookies();
    // Check both prefixed and non-prefixed for migration compatibility
    return jar.get(EMAIL_COOKIE)?.value || jar.get("qt_user_email")?.value || null;
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

/**
 * AuthContext with guaranteed companyId - returned by requireCompanyContext()
 */
export type CompanyAuthContext = AuthContext & {
  companyId: string;
  /** Role from CompanyUser membership (authoritative for company-scoped permissions) */
  membershipRole?: Role;
  /** Whether the membership is active */
  membershipActive?: boolean;
};

/**
 * Membership record from CompanyUser table
 */
export type Membership = {
  id: string;
  companyId: string;
  userId: string | null;
  email: string;
  role: Role;
  isActive: boolean;
};

/**
 * Get auth context safely - never throws, returns null on any error
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const jar = await cookies();
    // Check both prefixed and non-prefixed for migration compatibility
    const sid = jar.get(SID_COOKIE)?.value || jar.get("qt_sid_v1")?.value || "";
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
  } catch (error) {
    // Log but never throw - auth failures should return null
    console.error("[getAuthContext] Error:", error);
    return null;
  }
}

export async function requireRole(role: Role) {
  // Bearer token (mobile app) — checked first, no cookies needed
  const bearer = await resolveBearerToken();
  if (bearer) {
    if (role && bearer.role !== role && bearer.role !== "admin") {
      const err: any = new Error("Forbidden"); err.status = 403; throw err;
    }
    return bearer;
  }
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

  // Bearer token (mobile app) — checked first, no cookies needed
  const bearer = await resolveBearerToken();
  if (bearer && (allowed.includes(bearer.role) || bearer.role === "admin")) {
    return bearer;
  }

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

// ============================================================================
// COMPANY CONTEXT & MEMBERSHIP HELPERS
// ============================================================================

/**
 * Get membership record for a user in a company.
 * Tries userId first (if available), then falls back to email.
 * Returns null if no membership found.
 */
export async function getMembership(
  companyId: string,
  opts: { userId?: string; email?: string }
): Promise<Membership | null> {
  const prisma = p();

  // Try by userId first if available (faster, more reliable)
  if (opts.userId) {
    const byUserId = await prisma.companyUser.findFirst({
      where: { companyId, userId: opts.userId },
    });
    if (byUserId) {
      return {
        id: byUserId.id,
        companyId: byUserId.companyId,
        userId: byUserId.userId ?? null,
        email: byUserId.email,
        role: byUserId.role as Role,
        isActive: byUserId.isActive,
      };
    }
  }

  // Fall back to email lookup
  if (opts.email) {
    const byEmail = await prisma.companyUser.findUnique({
      where: { companyId_email: { companyId, email: opts.email.toLowerCase() } },
    });
    if (byEmail) {
      return {
        id: byEmail.id,
        companyId: byEmail.companyId,
        userId: byEmail.userId ?? null,
        email: byEmail.email,
        role: byEmail.role as Role,
        isActive: byEmail.isActive,
      };
    }
  }

  return null;
}

/**
 * Require a valid, active membership for the current user in the given company.
 * Throws 403 if membership not found or inactive.
 */
export async function requireMembership(
  companyId: string,
  opts: { userId?: string; email?: string }
): Promise<Membership> {
  const membership = await getMembership(companyId, opts);

  if (!membership) {
    const err: any = new Error("No membership found for this company");
    err.status = 403;
    throw err;
  }

  if (!membership.isActive) {
    const err: any = new Error("Membership is inactive");
    err.status = 403;
    throw err;
  }

  return membership;
}

/**
 * Require authenticated user with a valid company context.
 * This is the PRIMARY auth helper for all CRM data routes.
 *
 * - Ensures user is authenticated
 * - Ensures user has a companyId
 * - Optionally resolves membership for role-based permissions
 *
 * Use this instead of requireAuth() for any route that accesses company-scoped data.
 *
 * @throws 401 if not authenticated
 * @throws 401 if no company context (user not associated with a company)
 * @throws 403 if membership exists but is inactive
 */
// TTL cache for resolved company auth contexts (60s, keyed by session identifier)
const _authCache = new Map<string, { value: CompanyAuthContext; expiresAt: number }>();
const AUTH_CACHE_TTL_MS = 60_000;

export async function requireCompanyContext(): Promise<CompanyAuthContext> {
  const stopTotal = timeStart("auth_context");
  let msSession = 0;
  let msDb = 0;

  // 1. Read session cookie to get a stable cache key BEFORE any DB work
  const stopSession = timeStart("auth_context_session");
  const jar = await cookies();
  const sid = jar.get(SID_COOKIE)?.value || jar.get("qt_sid_v1")?.value || "";
  msSession = stopSession();

  // Check cache using sid (stable per-user session identifier)
  if (sid) {
    const cached = _authCache.get(sid);
    if (cached && cached.expiresAt > Date.now()) {
      logPerf("auth_context", { msTotal: stopTotal(), msSession, msDb: 0, cacheHit: true, ok: true });
      return cached.value;
    }
  }

  // 2. Full resolution path
  const stopDb = timeStart("auth_context_db");
  const ctx = await requireAuth();

  if (!ctx.companyId) {
    msDb = stopDb();
    logPerf("auth_context", { msTotal: stopTotal(), msSession, msDb, cacheHit: false, ok: false, err: "no_company" });
    const err: any = new Error("No company context - user not associated with a company");
    err.status = 401;
    throw err;
  }

  // Build the company context
  const companyCtx: CompanyAuthContext = {
    ...ctx,
    companyId: ctx.companyId,
  };

  // Try to resolve membership for authoritative role
  try {
    const membership = await getMembership(ctx.companyId, {
      userId: ctx.userId,
      email: ctx.email,
    });

    if (membership) {
      // Check if membership is active
      if (!membership.isActive) {
        msDb = stopDb();
        logPerf("auth_context", { msTotal: stopTotal(), msSession, msDb, cacheHit: false, ok: false, err: "inactive" });
        const err: any = new Error("Membership is inactive");
        err.status = 403;
        throw err;
      }
      companyCtx.membershipRole = membership.role;
      companyCtx.membershipActive = membership.isActive;
    }
    // If no membership record exists, we allow access based on User.companyId
    // This maintains backwards compatibility during migration
  } catch (e: any) {
    // If it's a 403 from inactive membership, rethrow
    if (e?.status === 403) throw e;
    // Otherwise, DB might not be available - continue without membership info
    console.warn("[requireCompanyContext] Could not resolve membership:", e);
  }
  msDb = stopDb();

  // 3. Cache the resolved context
  const cacheKey = sid || `${ctx.userId}:${ctx.companyId}`;
  _authCache.set(cacheKey, { value: companyCtx, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });

  logPerf("auth_context", { msTotal: stopTotal(), msSession, msDb, cacheHit: false, ok: true });
  return companyCtx;
}

/**
 * Get the effective role for permission checks.
 * Uses membership role if available (authoritative), otherwise falls back to User.role.
 */
export function getEffectiveRole(ctx: CompanyAuthContext): Role {
  return ctx.membershipRole ?? ctx.role;
}

/** Max impersonation duration: 60 minutes */
const IMPERSONATION_TTL_MS = 60 * 60 * 1000;

/**
 * Check if the current user is actively impersonating another user.
 * Uses the DB-backed impersonation_logs table as source of truth.
 * Returns the active impersonation record if found, null otherwise.
 *
 * Enforces a server-side TTL: sessions older than 60 minutes are
 * auto-expired on every call so that stale impersonation tokens
 * cannot be reused without polling the status endpoint.
 */
export async function isImpersonating(ctx: CompanyAuthContext): Promise<{ id: string; targetUserId: string } | null> {
  try {
    const prisma = p();
    const active = await prisma.impersonation_logs.findFirst({
      where: { adminUserId: ctx.userId, endedAt: null, companyId: ctx.companyId },
      select: { id: true, targetUserId: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    });
    if (!active) return null;

    // Enforce TTL — auto-expire sessions older than 60 minutes
    if (Date.now() - new Date(active.startedAt).getTime() > IMPERSONATION_TTL_MS) {
      await prisma.impersonation_logs.update({
        where: { id: active.id },
        data: { endedAt: new Date() },
      }).catch(() => {});
      await prisma.user.update({
        where: { id: ctx.userId },
        data: { currentImpersonationId: null },
      }).catch(() => {});
      return null;
    }

    return { id: active.id, targetUserId: active.targetUserId };
  } catch {
    return null;
  }
}

/**
 * Guard for write-path API routes: rejects mutations during impersonation.
 * Throws a 403 error with a clear message if the user is impersonating.
 * Call this at the top of POST/PUT/PATCH/DELETE handlers that should be read-only during impersonation.
 */
export async function rejectIfImpersonating(ctx: CompanyAuthContext): Promise<void> {
  const impersonation = await isImpersonating(ctx);
  if (impersonation) {
    const err: any = new Error("Write operations are not allowed during impersonation");
    err.status = 403;
    throw err;
  }
}

/** ✅ used by engineer/client routes */
export async function getUserEmail(): Promise<string | null> {
  const ctx = await getAuthContext();
  if (ctx?.email) return ctx.email;
  return await getEmailFromCookie();
}


/**
 * Require a specific capability for the current user.
 * Uses membership role (authoritative) if available, otherwise falls back to User.role.
 *
 * Capability checks:
 * 1. Check if role defaults include the capability
 * 2. Check UserPermission table for explicit grants
 */
export async function requireCapability(required: Capability) {
  // Use requireCompanyContext to ensure we have company context and membership info
  const ctx = await requireCompanyContext();

  // Use effective role (membership role if available, else User.role)
  const effectiveRole = getEffectiveRole(ctx);
  const roleKey = effectiveRole.toUpperCase();

  // Check if role defaults include the capability
  if (ROLE_DEFAULTS[roleKey]?.includes(required)) {
    return ctx;
  }

  // Check for explicit permissions in database
  const prisma = p();
  try {
    const rows = await prisma.userPermission.findMany({
      where: { companyId: ctx.companyId, userId: ctx.userId, enabled: true },
    });

    const caps = rows.map((r: { key: string }) => r.key) as Capability[];
    if (!hasCapability(effectiveRole, caps, required)) {
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


/**
 * Resolve auth context from a Bearer token (mobile app / Expo).
 * Returns null if no Authorization header or token is invalid.
 */
async function resolveBearerToken(): Promise<AuthContext | null> {
  try {
    // headers() is exported at runtime in Next 16 but missing from @types/next
    const { headers: getHeaders } = await import("next/headers") as any;
    const hdrs = await getHeaders();
    const authHeader = (hdrs as any).get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return null;
    const rawToken = authHeader.slice(7).trim();
    if (!rawToken) return null;

    const result = await validateAppToken(rawToken);
    if (!result) return null;

    const { session } = result;
    return {
      role: session.user.role as Role,
      email: session.user.email,
      companyId: session.user.companyId ?? null,
      userId: session.user.id,
      sessionId: session.id,
    };
  } catch {
    return null;
  }
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
  const auth = getNeonAuthInstance();
  if (!auth) return null;

  const sessionResult = await auth.getSession();
  const user = (sessionResult as any)?.data?.user ?? (sessionResult as any)?.user;
  if (!user) return null;

  const prisma = p();

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