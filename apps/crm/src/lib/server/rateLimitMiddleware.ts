/**
 * Comprehensive Rate Limiting Middleware
 *
 * Provides global rate limiting for abuse prevention:
 * - Per-IP rate limiting on auth endpoints
 * - Per-identifier (email/user) rate limiting
 * - Brute force protection on login/password reset
 * - Public endpoint protection
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Extract IP address from request
 */
function getIpAddress(req: NextRequest): string {
  // Check common proxy headers in order of preference
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip: string) => ip.trim());
    return ips[0]; // First IP is the client
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  // Fallback
  return "unknown";
}

/**
 * Rate limit configuration for different endpoint types
 */
const RATE_LIMITS = {
  // Auth endpoints - strict limits
  AUTH_MAGIC_LINK: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  AUTH_PASSWORD_LOGIN: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 per 15 minutes
  AUTH_PASSWORD_RESET: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour

  // Public enquiry endpoints
  PUBLIC_ENQUIRY: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour

  // Quote/Invoice acceptance (per token to prevent spam)
  PUBLIC_ACCEPT: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour per token

  // General API (authenticated users)
  API_GENERAL: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute

  // Admin operations (more generous)
  API_ADMIN: { limit: 200, windowMs: 60 * 1000 }, // 200 per minute
} as const;

/**
 * Rate limit a request by IP address
 */
export function rateLimitByIp(
  req: NextRequest,
  config: { limit: number; windowMs: number },
  keyPrefix = "ip"
): { ok: boolean; remaining: number; resetAt: number } {
  const ip = getIpAddress(req);
  const key = `${keyPrefix}:${ip}`;
  return rateLimit({ key, limit: config.limit, windowMs: config.windowMs });
}

/**
 * Rate limit a request by identifier (email, userId, token, etc.)
 */
export function rateLimitByIdentifier(
  identifier: string,
  config: { limit: number; windowMs: number },
  keyPrefix = "id"
): { ok: boolean; remaining: number; resetAt: number } {
  const key = `${keyPrefix}:${identifier}`;
  return rateLimit({ key, limit: config.limit, windowMs: config.windowMs });
}

/**
 * Combined IP + identifier rate limiting
 */
export function rateLimitCombined(
  req: NextRequest,
  identifier: string,
  config: { limit: number; windowMs: number },
  keyPrefix = "combined"
): { ok: boolean; remaining: number; resetAt: number } {
  const ip = getIpAddress(req);
  const key = `${keyPrefix}:${ip}:${identifier}`;
  return rateLimit({ key, limit: config.limit, windowMs: config.windowMs });
}

/**
 * Apply rate limiting to magic link requests
 */
export function rateLimitMagicLink(req: NextRequest, email: string) {
  // Check both IP and email to prevent abuse
  const ipCheck = rateLimitByIp(req, RATE_LIMITS.AUTH_MAGIC_LINK, "magic:ip");
  if (!ipCheck.ok) {
    return {
      ok: false,
      error: "Too many magic link requests from this IP. Please try again later.",
      resetAt: ipCheck.resetAt,
    };
  }

  const emailCheck = rateLimitByIdentifier(email, RATE_LIMITS.AUTH_MAGIC_LINK, "magic:email");
  if (!emailCheck.ok) {
    return {
      ok: false,
      error: "Too many magic link requests for this email. Please try again later.",
      resetAt: emailCheck.resetAt,
    };
  }

  return { ok: true, remaining: Math.min(ipCheck.remaining, emailCheck.remaining) };
}

/**
 * Apply rate limiting to password login attempts
 */
export function rateLimitPasswordLogin(req: NextRequest, email: string) {
  // Check both IP and email to prevent brute force
  const ipCheck = rateLimitByIp(req, RATE_LIMITS.AUTH_PASSWORD_LOGIN, "login:ip");
  if (!ipCheck.ok) {
    return {
      ok: false,
      error: "Too many login attempts from this IP. Please try again later.",
      resetAt: ipCheck.resetAt,
    };
  }

  const emailCheck = rateLimitByIdentifier(email, RATE_LIMITS.AUTH_PASSWORD_LOGIN, "login:email");
  if (!emailCheck.ok) {
    return {
      ok: false,
      error: "Too many login attempts for this account. Please try again later or use magic link.",
      resetAt: emailCheck.resetAt,
    };
  }

  return { ok: true, remaining: Math.min(ipCheck.remaining, emailCheck.remaining) };
}

/**
 * Apply rate limiting to password reset requests
 */
export function rateLimitPasswordReset(req: NextRequest, email: string) {
  const ipCheck = rateLimitByIp(req, RATE_LIMITS.AUTH_PASSWORD_RESET, "reset:ip");
  if (!ipCheck.ok) {
    return {
      ok: false,
      error: "Too many password reset requests. Please try again later.",
      resetAt: ipCheck.resetAt,
    };
  }

  const emailCheck = rateLimitByIdentifier(email, RATE_LIMITS.AUTH_PASSWORD_RESET, "reset:email");
  if (!emailCheck.ok) {
    return {
      ok: false,
      error: "Too many password reset requests for this email. Please try again later.",
      resetAt: emailCheck.resetAt,
    };
  }

  return { ok: true, remaining: Math.min(ipCheck.remaining, emailCheck.remaining) };
}

/**
 * Apply rate limiting to public enquiry forms
 */
export function rateLimitPublicEnquiry(req: NextRequest) {
  const ipCheck = rateLimitByIp(req, RATE_LIMITS.PUBLIC_ENQUIRY, "enquiry:ip");
  if (!ipCheck.ok) {
    return {
      ok: false,
      error: "Too many enquiries from this location. Please try again later.",
      resetAt: ipCheck.resetAt,
    };
  }

  return { ok: true, remaining: ipCheck.remaining };
}

/**
 * Apply rate limiting to quote/invoice acceptance
 */
export function rateLimitPublicAccept(req: NextRequest, token: string) {
  const ipCheck = rateLimitByIp(req, RATE_LIMITS.PUBLIC_ACCEPT, "accept:ip");
  if (!ipCheck.ok) {
    return {
      ok: false,
      error: "Too many requests. Please try again later.",
      resetAt: ipCheck.resetAt,
    };
  }

  const tokenCheck = rateLimitByIdentifier(token, RATE_LIMITS.PUBLIC_ACCEPT, "accept:token");
  if (!tokenCheck.ok) {
    return {
      ok: false,
      error: "Too many acceptance attempts for this document. Please contact support.",
      resetAt: tokenCheck.resetAt,
    };
  }

  return { ok: true, remaining: Math.min(ipCheck.remaining, tokenCheck.remaining) };
}

/**
 * Apply rate limiting to general API requests (authenticated)
 */
export function rateLimitApiGeneral(userId: string) {
  const check = rateLimitByIdentifier(userId, RATE_LIMITS.API_GENERAL, "api:user");
  if (!check.ok) {
    return {
      ok: false,
      error: "API rate limit exceeded. Please slow down.",
      resetAt: check.resetAt,
    };
  }

  return { ok: true, remaining: check.remaining };
}

/**
 * Apply rate limiting to admin API requests (more generous)
 */
export function rateLimitApiAdmin(userId: string) {
  const check = rateLimitByIdentifier(userId, RATE_LIMITS.API_ADMIN, "api:admin");
  if (!check.ok) {
    return {
      ok: false,
      error: "API rate limit exceeded. Please slow down.",
      resetAt: check.resetAt,
    };
  }

  return { ok: true, remaining: check.remaining };
}

/**
 * Create a rate limit response with appropriate headers
 */
export function createRateLimitResponse(params: {
  error: string;
  resetAt: number;
  status?: number;
}): Response {
  const resetDate = new Date(params.resetAt);
  const retryAfter = Math.ceil((params.resetAt - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: params.error,
      code: "RATE_LIMIT_EXCEEDED",
      resetAt: resetDate.toISOString(),
      retryAfter,
    },
    {
      status: params.status ?? 429,
      headers: {
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Reset": resetDate.toISOString(),
      },
    }
  );
}

/**
 * Middleware wrapper to apply rate limiting and return 429 if exceeded
 */
export function withRateLimit<T>(
  checkFn: () => { ok: boolean; error?: string; resetAt?: number },
  handler: () => Promise<T>
): Promise<T | Response> {
  const result = checkFn();
  if (!result.ok) {
    return Promise.resolve(
      createRateLimitResponse({
        error: result.error || "Rate limit exceeded",
        resetAt: result.resetAt || Date.now() + 60000,
      })
    ) as Promise<T | Response>;
  }
  return handler();
}
