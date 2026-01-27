/**
 * Tests for server-side rate limit utilities
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getClientIp, rateLimit } from "./rateLimit";

// Mock the base rateLimit
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockReturnValue({ ok: true, remaining: 5, resetAt: Date.now() + 60000 }),
}));

describe("server/rateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getClientIp", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const req = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });

      expect(getClientIp(req)).toBe("192.168.1.1");
    });

    it("should extract first IP from multiple IPs", () => {
      const req = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1, 172.16.0.1" },
      });

      expect(getClientIp(req)).toBe("192.168.1.1");
    });

    it("should trim whitespace from IP", () => {
      const req = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "  192.168.1.1  " },
      });

      expect(getClientIp(req)).toBe("192.168.1.1");
    });

    it("should return 'local' when no x-forwarded-for header", () => {
      const req = new Request("http://localhost/api/test");

      expect(getClientIp(req)).toBe("local");
    });
  });

  describe("rateLimit", () => {
    it("should call base rateLimit with options", () => {
      const opts = { key: "test", limit: 10, windowMs: 60000 };

      const result = rateLimit(opts);

      expect(result).toEqual({
        ok: true,
        remaining: 5,
        resetAt: expect.any(Number),
      });
    });
  });
});
