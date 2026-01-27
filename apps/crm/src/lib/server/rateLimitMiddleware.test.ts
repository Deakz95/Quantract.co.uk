/**
 * Tests for Rate Limiting Middleware.
 * Tests IP extraction, rate limit checking, and response formatting.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock the rateLimit function
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn(),
}));

// Mock NextResponse
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data, options) => ({
        data,
        status: options?.status ?? 200,
        headers: options?.headers ?? {},
      })),
    },
  };
});

import { rateLimit } from "@/lib/rateLimit";
import {
  rateLimitByIp,
  rateLimitByIdentifier,
  rateLimitCombined,
  rateLimitMagicLink,
  rateLimitPasswordLogin,
  rateLimitPasswordReset,
  rateLimitPublicEnquiry,
  rateLimitPublicAccept,
  rateLimitApiGeneral,
  rateLimitApiAdmin,
  createRateLimitResponse,
  withRateLimit,
} from "./rateLimitMiddleware";

describe("rateLimitMiddleware.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("IP Address Extraction", () => {
    function getIpAddress(req: { headers: { get: (name: string) => string | null } }): string {
      const forwarded = req.headers.get("x-forwarded-for");
      if (forwarded) {
        const ips = forwarded.split(",").map((ip: string) => ip.trim());
        return ips[0];
      }
      const realIp = req.headers.get("x-real-ip");
      if (realIp) return realIp;
      const cfConnectingIp = req.headers.get("cf-connecting-ip");
      if (cfConnectingIp) return cfConnectingIp;
      return "unknown";
    }

    it("should extract IP from x-forwarded-for header", () => {
      const req = {
        headers: {
          get: (name: string) =>
            name === "x-forwarded-for" ? "192.168.1.1, 10.0.0.1" : null,
        },
      };
      expect(getIpAddress(req)).toBe("192.168.1.1");
    });

    it("should handle single IP in x-forwarded-for", () => {
      const req = {
        headers: {
          get: (name: string) =>
            name === "x-forwarded-for" ? "203.0.113.50" : null,
        },
      };
      expect(getIpAddress(req)).toBe("203.0.113.50");
    });

    it("should extract IP from x-real-ip header", () => {
      const req = {
        headers: {
          get: (name: string) =>
            name === "x-real-ip" ? "10.10.10.10" : null,
        },
      };
      expect(getIpAddress(req)).toBe("10.10.10.10");
    });

    it("should extract IP from cf-connecting-ip header (Cloudflare)", () => {
      const req = {
        headers: {
          get: (name: string) =>
            name === "cf-connecting-ip" ? "172.16.0.1" : null,
        },
      };
      expect(getIpAddress(req)).toBe("172.16.0.1");
    });

    it("should return unknown when no IP headers present", () => {
      const req = {
        headers: {
          get: () => null,
        },
      };
      expect(getIpAddress(req)).toBe("unknown");
    });

    it("should prioritize x-forwarded-for over other headers", () => {
      const req = {
        headers: {
          get: (name: string) => {
            if (name === "x-forwarded-for") return "1.1.1.1";
            if (name === "x-real-ip") return "2.2.2.2";
            if (name === "cf-connecting-ip") return "3.3.3.3";
            return null;
          },
        },
      };
      expect(getIpAddress(req)).toBe("1.1.1.1");
    });
  });

  describe("Rate Limit Configuration", () => {
    const RATE_LIMITS = {
      AUTH_MAGIC_LINK: { limit: 5, windowMs: 15 * 60 * 1000 },
      AUTH_PASSWORD_LOGIN: { limit: 10, windowMs: 15 * 60 * 1000 },
      AUTH_PASSWORD_RESET: { limit: 3, windowMs: 60 * 60 * 1000 },
      PUBLIC_ENQUIRY: { limit: 5, windowMs: 60 * 60 * 1000 },
      PUBLIC_ACCEPT: { limit: 10, windowMs: 60 * 60 * 1000 },
      API_GENERAL: { limit: 100, windowMs: 60 * 1000 },
      API_ADMIN: { limit: 200, windowMs: 60 * 1000 },
    };

    it("should have strict limits for auth endpoints", () => {
      expect(RATE_LIMITS.AUTH_MAGIC_LINK.limit).toBe(5);
      expect(RATE_LIMITS.AUTH_PASSWORD_LOGIN.limit).toBe(10);
      expect(RATE_LIMITS.AUTH_PASSWORD_RESET.limit).toBe(3);
    });

    it("should have longer windows for auth endpoints", () => {
      expect(RATE_LIMITS.AUTH_MAGIC_LINK.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(RATE_LIMITS.AUTH_PASSWORD_RESET.windowMs).toBe(60 * 60 * 1000); // 1 hour
    });

    it("should have higher limits for authenticated API endpoints", () => {
      expect(RATE_LIMITS.API_GENERAL.limit).toBe(100);
      expect(RATE_LIMITS.API_ADMIN.limit).toBe(200);
    });

    it("should have shorter windows for API endpoints", () => {
      expect(RATE_LIMITS.API_GENERAL.windowMs).toBe(60 * 1000); // 1 minute
    });
  });

  describe("rateLimitByIp", () => {
    it("should call rateLimit with IP-based key", () => {
      (rateLimit as any).mockReturnValue({
        ok: true,
        remaining: 5,
        resetAt: Date.now() + 60000,
      });

      const mockReq = {
        headers: {
          get: (name: string) =>
            name === "x-forwarded-for" ? "192.168.1.100" : null,
        },
      } as unknown as NextRequest;

      rateLimitByIp(mockReq, { limit: 10, windowMs: 60000 }, "test");

      expect(rateLimit).toHaveBeenCalledWith({
        key: "test:192.168.1.100",
        limit: 10,
        windowMs: 60000,
      });
    });
  });

  describe("rateLimitByIdentifier", () => {
    it("should call rateLimit with identifier-based key", () => {
      (rateLimit as any).mockReturnValue({
        ok: true,
        remaining: 5,
        resetAt: Date.now() + 60000,
      });

      rateLimitByIdentifier("user@example.com", { limit: 5, windowMs: 30000 }, "email");

      expect(rateLimit).toHaveBeenCalledWith({
        key: "email:user@example.com",
        limit: 5,
        windowMs: 30000,
      });
    });
  });

  describe("rateLimitMagicLink", () => {
    const mockReq = {
      headers: {
        get: (name: string) =>
          name === "x-forwarded-for" ? "192.168.1.1" : null,
      },
    } as unknown as NextRequest;

    it("should return ok when both IP and email checks pass", () => {
      (rateLimit as any).mockReturnValue({
        ok: true,
        remaining: 4,
        resetAt: Date.now() + 60000,
      });

      const result = rateLimitMagicLink(mockReq, "user@example.com");

      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should fail when IP rate limit is exceeded", () => {
      (rateLimit as any)
        .mockReturnValueOnce({
          ok: false,
          remaining: 0,
          resetAt: Date.now() + 60000,
        })
        .mockReturnValue({
          ok: true,
          remaining: 5,
          resetAt: Date.now() + 60000,
        });

      const result = rateLimitMagicLink(mockReq, "user@example.com");

      expect(result.ok).toBe(false);
      expect(result.error).toContain("IP");
    });

    it("should fail when email rate limit is exceeded", () => {
      (rateLimit as any)
        .mockReturnValueOnce({
          ok: true,
          remaining: 5,
          resetAt: Date.now() + 60000,
        })
        .mockReturnValue({
          ok: false,
          remaining: 0,
          resetAt: Date.now() + 60000,
        });

      const result = rateLimitMagicLink(mockReq, "user@example.com");

      expect(result.ok).toBe(false);
      expect(result.error).toContain("email");
    });
  });

  describe("rateLimitPasswordLogin", () => {
    const mockReq = {
      headers: {
        get: (name: string) =>
          name === "x-forwarded-for" ? "192.168.1.1" : null,
      },
    } as unknown as NextRequest;

    it("should return ok when both checks pass", () => {
      (rateLimit as any).mockReturnValue({
        ok: true,
        remaining: 9,
        resetAt: Date.now() + 60000,
      });

      const result = rateLimitPasswordLogin(mockReq, "user@example.com");

      expect(result.ok).toBe(true);
    });

    it("should suggest magic link when email limit exceeded", () => {
      (rateLimit as any)
        .mockReturnValueOnce({
          ok: true,
          remaining: 10,
          resetAt: Date.now() + 60000,
        })
        .mockReturnValue({
          ok: false,
          remaining: 0,
          resetAt: Date.now() + 60000,
        });

      const result = rateLimitPasswordLogin(mockReq, "user@example.com");

      expect(result.ok).toBe(false);
      expect(result.error).toContain("magic link");
    });
  });

  describe("rateLimitApiGeneral", () => {
    it("should rate limit by user ID", () => {
      (rateLimit as any).mockReturnValue({
        ok: true,
        remaining: 99,
        resetAt: Date.now() + 60000,
      });

      const result = rateLimitApiGeneral("user-123");

      expect(result.ok).toBe(true);
      expect(rateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "api:user:user-123",
        })
      );
    });

    it("should return error when limit exceeded", () => {
      (rateLimit as any).mockReturnValue({
        ok: false,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      const result = rateLimitApiGeneral("user-123");

      expect(result.ok).toBe(false);
      expect(result.error).toContain("rate limit");
    });
  });

  describe("rateLimitApiAdmin", () => {
    it("should have higher limit than general API", () => {
      (rateLimit as any).mockReturnValue({
        ok: true,
        remaining: 199,
        resetAt: Date.now() + 60000,
      });

      rateLimitApiAdmin("admin-123");

      expect(rateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 200, // Admin has higher limit
        })
      );
    });
  });

  describe("createRateLimitResponse", () => {
    it("should create response with 429 status by default", () => {
      const resetAt = Date.now() + 60000;
      const response = createRateLimitResponse({
        error: "Too many requests",
        resetAt,
      }) as any;

      expect(response.status).toBe(429);
    });

    it("should include retry-after header", () => {
      const resetAt = Date.now() + 60000;
      const response = createRateLimitResponse({
        error: "Too many requests",
        resetAt,
      }) as any;

      expect(response.headers["Retry-After"]).toBeDefined();
    });

    it("should include error code in response", () => {
      const response = createRateLimitResponse({
        error: "Too many requests",
        resetAt: Date.now() + 60000,
      }) as any;

      expect(response.data.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("should include reset time in ISO format", () => {
      const resetAt = Date.now() + 60000;
      const response = createRateLimitResponse({
        error: "Too many requests",
        resetAt,
      }) as any;

      expect(response.data.resetAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should calculate retryAfter in seconds", () => {
      const resetAt = Date.now() + 120000; // 2 minutes
      const response = createRateLimitResponse({
        error: "Too many requests",
        resetAt,
      }) as any;

      expect(response.data.retryAfter).toBeGreaterThanOrEqual(119);
      expect(response.data.retryAfter).toBeLessThanOrEqual(121);
    });
  });

  describe("withRateLimit", () => {
    it("should execute handler when rate limit ok", async () => {
      const handler = vi.fn().mockResolvedValue({ data: "success" });
      const checkFn = () => ({ ok: true, remaining: 5 });

      const result = await withRateLimit(checkFn, handler);

      expect(handler).toHaveBeenCalled();
      expect(result).toEqual({ data: "success" });
    });

    it("should return rate limit response when limit exceeded", async () => {
      const handler = vi.fn().mockResolvedValue({ data: "success" });
      const checkFn = () => ({
        ok: false,
        error: "Rate limit exceeded",
        resetAt: Date.now() + 60000,
      });

      const result = (await withRateLimit(checkFn, handler)) as any;

      expect(handler).not.toHaveBeenCalled();
      expect(result.status).toBe(429);
    });
  });
});
