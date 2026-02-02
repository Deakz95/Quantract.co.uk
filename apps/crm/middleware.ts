import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function makeId() {
  return (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2)) as string;
}

const ROLE_COOKIE = "qt_session_v1";
const ROLE_COOKIE_PREFIXED = "__Host-qt_session_v1";
const COMPANY_COOKIE = "qt_company_id";
const COMPANY_COOKIE_PREFIXED = "__Host-qt_company_id";
const PROFILE_COOKIE = "qt_profile_complete";
const PROFILE_COOKIE_PREFIXED = "__Host-qt_profile_complete";
const TENANT_COOKIE = "qt_tenant_subdomain";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Reserved subdomains that should not be treated as tenant subdomains
const RESERVED_SUBDOMAINS = ["www", "api", "app", "admin", "mail", "email", "ftp", "ssl", "cdn", "static", "assets"];

/**
 * Extract subdomain from hostname
 * e.g., "hawksworth.quantract.co.uk" -> "hawksworth"
 * e.g., "quantract.co.uk" -> null
 * e.g., "localhost:3000" -> null
 */
function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(":")[0];
  
  // Handle localhost
  if (host === "localhost" || host === "127.0.0.1") {
    return null;
  }
  
  // Split hostname into parts
  const parts = host.split(".");
  
  // Need at least 3 parts for a subdomain (subdomain.domain.tld)
  // For .co.uk we need 4 parts (subdomain.domain.co.uk)
  if (host.endsWith(".co.uk") && parts.length >= 4) {
    const subdomain = parts[0];
    if (!RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
      return subdomain.toLowerCase();
    }
  } else if (parts.length >= 3 && !host.endsWith(".co.uk")) {
    // For regular TLDs like .com
    const subdomain = parts[0];
    if (!RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
      return subdomain.toLowerCase();
    }
  }
  
  return null;
}

function isPublicPath(pathname: string) {
  // Public pages + auth endpoints
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/public")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname === "/") return true; // Landing page is public

  // Public auth UI
  if (pathname.startsWith("/auth/")) return true;

  // Portal login pages
  if (pathname === "/admin/login" || pathname === "/client/login" || pathname === "/engineer/login" || pathname === "/ops/login") return true;

  // Public invite acceptance pages
  if (pathname.startsWith("/invite/")) return true;

  // Public API endpoints
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/api/better-auth/")) return true;
  if (pathname.startsWith("/api/public/")) return true;

  // Tokenized client endpoints (public access via token)
  if (pathname.match(/^\/api\/client\/quotes\/[^\/]+$/)) return true; // GET quote by token
  if (pathname.match(/^\/api\/client\/quotes\/[^\/]+\/accept$/)) return true; // POST accept quote
  if (pathname.match(/^\/api\/client\/quotes\/[^\/]+\/pdf$/)) return true; // GET quote PDF

  // Tokenized client UI pages (public access via token)
  if (pathname.match(/^\/client\/quotes\/[^\/]+/)) return true; // View quote by token (including /sign, /certificate, etc.)

  // Public certificate verification
  if (pathname.startsWith("/verify/")) return true;

  // Remote assist join page (public, token-authenticated)
  if (pathname.startsWith("/assist/")) return true;

  // Cron endpoints (protected by CRON_SECRET header)
  if (pathname.startsWith("/api/cron/")) return true;

  // Webhooks / health (if any)
  if (pathname === "/api/health" || pathname.startsWith("/api/health/")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;

  return false;
}

function requiredRoleForPath(pathname: string): "admin" | "client" | "engineer" | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/client")) return "client";
  if (pathname.startsWith("/engineer")) return "engineer";
  if (pathname.startsWith("/ops")) return "admin"; // ops portal is admin/engineer domain; default protect as admin
  if (pathname.startsWith("/portal")) return "client";
  // Protect admin APIs too
  if (pathname.startsWith("/api/admin")) return "admin";
  if (pathname.startsWith("/api/client")) return "client";
  if (pathname.startsWith("/api/engineer")) return "engineer";
  if (pathname.startsWith("/api/ops")) return "admin";
  return null;
}


function isOnboardingPath(pathname: string) {
  return pathname === "/client/onboarding" || pathname === "/engineer/onboarding" || pathname === "/admin/onboarding";
}

function isProfileApi(pathname: string) {
  return pathname.startsWith("/api/profile/");
}

function loginUrlForRole(role: "admin" | "client" | "engineer") {
  if (role === "admin") return "/admin/login";
  if (role === "client") return "/client/login";
  return "/engineer/login";
}

// ── Simple in-memory rate limiter for Edge runtime ──
const rlBuckets = new Map<string, { count: number; resetAt: number }>();
function edgeRateLimit(ip: string, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const k = `${key}:${ip}`;
  const b = rlBuckets.get(k);
  if (!b || now > b.resetAt) {
    rlBuckets.set(k, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}
// Lazy cleanup every 60s
let rlLastClean = 0;
function rlCleanup() {
  const now = Date.now();
  if (now - rlLastClean < 60_000) return;
  rlLastClean = now;
  for (const [k, b] of rlBuckets) {
    if (now > b.resetAt) rlBuckets.delete(k);
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // =========================================================================
  // HTTPS Redirect (Proxy-aware for Render)
  // Render terminates TLS and forwards X-Forwarded-Proto header
  // =========================================================================
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https" || req.nextUrl.protocol === "https:";

  // Only redirect in production, and only if we're behind a proxy (has x-forwarded-proto)
  if (IS_PRODUCTION && forwardedProto && !isHttps) {
    const httpsUrl = req.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 301);
  }

  const requestId = req.headers.get("x-request-id") ?? makeId();

  // ── Rate limit + noindex for public /verify/ paths ──
  if (pathname.startsWith("/verify/")) {
    rlCleanup();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rlKey = pathname.endsWith("/pdf") ? "verify-pdf" : pathname.endsWith("/json") ? "verify-json" : "verify-page";
    const limit = pathname.endsWith("/pdf") ? 20 : pathname.endsWith("/json") ? 20 : 30; // per IP per window
    const rl = edgeRateLimit(ip, rlKey, limit, 60_000); // 1-minute window
    if (!rl.ok) {
      return new NextResponse(JSON.stringify({ ok: false, error: "Too many requests" }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(rl.retryAfter),
        },
      });
    }
  }

  // Extract subdomain for multi-tenant routing
  const subdomain = extractSubdomain(hostname);

  // Create response with request ID
  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);

  // Security headers: Permissions-Policy
  // Allow camera/mic only on /assist/* pages (remote assist video calls)
  if (pathname.startsWith("/assist/")) {
    res.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  } else {
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  }

  // Noindex for /verify/ pages
  if (pathname.startsWith("/verify/")) {
    res.headers.set("x-robots-tag", "noindex, nofollow");
  }

  // Set subdomain header for downstream use
  if (subdomain) {
    res.headers.set("x-tenant-subdomain", subdomain);
    // Also set a cookie so server components can access it
    res.cookies.set(TENANT_COOKIE, subdomain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  if (isPublicPath(pathname)) return res;

  const needed = requiredRoleForPath(pathname);
  if (!needed) return res;

  // Check both prefixed and non-prefixed cookies for migration compatibility
  const raw = req.cookies.get(ROLE_COOKIE_PREFIXED)?.value
    ?? req.cookies.get(ROLE_COOKIE)?.value ?? "";
  const role = raw.startsWith("role:") ? (raw.slice("role:".length) as any) : null;

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = loginUrlForRole(needed);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Basic role isolation: block crossing between portals
  // ADMIN CAN ACCESS EVERYTHING - no restrictions for admin role
  if (role === "admin") {
    // Admin has universal access - allow through
    return res;
  }

  // Non-admin roles are restricted to their portals
  if (needed === "admin" && role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = loginUrlForRole("admin");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (needed === "client" && role !== "client") {
    const url = req.nextUrl.clone();
    url.pathname = loginUrlForRole("client");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (needed === "engineer" && role !== "engineer") {
    const url = req.nextUrl.clone();
    url.pathname = loginUrlForRole("engineer");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }


  // Company gating (session should always have a companyId for client/engineer, and usually for admin)
  // Check both prefixed and non-prefixed cookies for migration compatibility
  const companyId = req.cookies.get(COMPANY_COOKIE_PREFIXED)?.value
    || req.cookies.get(COMPANY_COOKIE)?.value || "";
  if ((role === "client" || role === "engineer") && !companyId) {
    const url = req.nextUrl.clone();
    url.pathname = loginUrlForRole(role);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Profile completion gating (Edge-safe via cookie set at login)
  // Check both prefixed and non-prefixed cookies for migration compatibility
  const pc = req.cookies.get(PROFILE_COOKIE_PREFIXED)?.value
    || req.cookies.get(PROFILE_COOKIE)?.value || "";
  const isComplete = pc === "1";
  if (!isComplete && !isOnboardingPath(pathname) && !isProfileApi(pathname)) {
    const url = req.nextUrl.clone();
    if (role === "admin") url.pathname = "/admin/onboarding";
    else if (role === "client") url.pathname = "/client/onboarding";
    else url.pathname = "/engineer/onboarding";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
