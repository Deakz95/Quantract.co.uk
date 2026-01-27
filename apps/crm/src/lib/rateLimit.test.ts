/**
 * Tests for rateLimit module (in-memory implementation)
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { rateLimit, rateLimitAsync } from "./rateLimit";

// Clear module cache to reset in-memory buckets
beforeEach(() => {
  vi.resetModules();
});

describe("rateLimit", () => {
  describe("rateLimit (synchronous)", () => {
    it("should allow first request", () => {
      const result = rateLimit({ key: "test-1", limit: 5, windowMs: 60000 });
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should track remaining requests", () => {
      const key = "test-track-" + Math.random();

      const r1 = rateLimit({ key, limit: 3, windowMs: 60000 });
      expect(r1.remaining).toBe(2);

      const r2 = rateLimit({ key, limit: 3, windowMs: 60000 });
      expect(r2.remaining).toBe(1);

      const r3 = rateLimit({ key, limit: 3, windowMs: 60000 });
      expect(r3.remaining).toBe(0);
    });

    it("should block requests over limit", () => {
      const key = "test-block-" + Math.random();

      // Use up all requests
      for (let i = 0; i < 3; i++) {
        rateLimit({ key, limit: 3, windowMs: 60000 });
      }

      // Next request should be blocked
      const result = rateLimit({ key, limit: 3, windowMs: 60000 });
      expect(result.ok).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should return resetAt timestamp", () => {
      const key = "test-reset-" + Math.random();
      const now = Date.now();
      const windowMs = 60000;

      const result = rateLimit({ key, limit: 5, windowMs });

      expect(result.resetAt).toBeGreaterThan(now);
      expect(result.resetAt).toBeLessThanOrEqual(now + windowMs + 100); // Allow small timing variance
    });

    it("should use different buckets for different keys", () => {
      const key1 = "test-key1-" + Math.random();
      const key2 = "test-key2-" + Math.random();

      // Use up all requests for key1
      for (let i = 0; i < 2; i++) {
        rateLimit({ key: key1, limit: 2, windowMs: 60000 });
      }

      // key2 should still have full limit
      const result = rateLimit({ key: key2, limit: 2, windowMs: 60000 });
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it("should handle limit of 1", () => {
      const key = "test-single-" + Math.random();

      const r1 = rateLimit({ key, limit: 1, windowMs: 60000 });
      expect(r1.ok).toBe(true);
      expect(r1.remaining).toBe(0);

      const r2 = rateLimit({ key, limit: 1, windowMs: 60000 });
      expect(r2.ok).toBe(false);
    });

    it("should handle high limits", () => {
      const key = "test-high-" + Math.random();

      const result = rateLimit({ key, limit: 1000, windowMs: 60000 });
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(999);
    });
  });

  describe("rateLimitAsync", () => {
    it("should allow first request", async () => {
      const key = "async-test-1-" + Math.random();
      const result = await rateLimitAsync({ key, limit: 5, windowMs: 60000 });
      expect(result.ok).toBe(true);
    });

    it("should track remaining requests", async () => {
      const key = "async-track-" + Math.random();

      await rateLimitAsync({ key, limit: 3, windowMs: 60000 });
      await rateLimitAsync({ key, limit: 3, windowMs: 60000 });
      const r3 = await rateLimitAsync({ key, limit: 3, windowMs: 60000 });

      expect(r3.remaining).toBe(0);
    });

    it("should block requests over limit", async () => {
      const key = "async-block-" + Math.random();

      for (let i = 0; i < 3; i++) {
        await rateLimitAsync({ key, limit: 3, windowMs: 60000 });
      }

      const result = await rateLimitAsync({ key, limit: 3, windowMs: 60000 });
      expect(result.ok).toBe(false);
    });

    it("should return resetAt timestamp", async () => {
      const key = "async-reset-" + Math.random();
      const now = Date.now();

      const result = await rateLimitAsync({ key, limit: 5, windowMs: 60000 });

      expect(result.resetAt).toBeGreaterThan(now);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty key", () => {
      const result = rateLimit({ key: "", limit: 5, windowMs: 60000 });
      expect(result.ok).toBe(true);
    });

    it("should handle very long key", () => {
      const longKey = "a".repeat(1000) + Math.random();
      const result = rateLimit({ key: longKey, limit: 5, windowMs: 60000 });
      expect(result.ok).toBe(true);
    });

    it("should handle special characters in key", () => {
      const key = "test:user@email.com/path?query=1&foo=bar#hash-" + Math.random();
      const result = rateLimit({ key, limit: 5, windowMs: 60000 });
      expect(result.ok).toBe(true);
    });

    it("should handle unicode in key", () => {
      const key = "test-用户-пользователь-" + Math.random();
      const result = rateLimit({ key, limit: 5, windowMs: 60000 });
      expect(result.ok).toBe(true);
    });

    it("should handle very small window", () => {
      const key = "small-window-" + Math.random();
      const result = rateLimit({ key, limit: 5, windowMs: 1 });
      expect(result.ok).toBe(true);
    });

    it("should handle very large window", () => {
      const key = "large-window-" + Math.random();
      const result = rateLimit({ key, limit: 5, windowMs: 86400000 * 365 }); // 1 year
      expect(result.ok).toBe(true);
    });
  });
});
