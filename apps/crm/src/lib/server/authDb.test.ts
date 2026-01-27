/**
 * Tests for authDb pure functions
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { sha256, randomToken } from "./authDb";

// Mock Prisma - we only test pure functions
vi.mock("@/lib/server/prisma", () => ({
  getPrisma: vi.fn().mockReturnValue(null),
}));

describe("authDb", () => {
  describe("sha256", () => {
    it("should hash string consistently", () => {
      const hash1 = sha256("test");
      const hash2 = sha256("test");

      expect(hash1).toBe(hash2);
    });

    it("should produce correct SHA256 hash", () => {
      // Known SHA256 of "hello"
      const hash = sha256("hello");

      expect(hash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    });

    it("should produce 64-character hex string", () => {
      const hash = sha256("any string");

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = sha256("input1");
      const hash2 = sha256("input2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", () => {
      const hash = sha256("");

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle unicode", () => {
      const hash = sha256("日本語テスト");

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("randomToken", () => {
    it("should generate 64-character token by default", () => {
      const token = randomToken();

      expect(token.length).toBe(64); // 32 bytes * 2 hex chars
    });

    it("should generate custom length token", () => {
      const token = randomToken(16);

      expect(token.length).toBe(32); // 16 bytes * 2 hex chars
    });

    it("should generate hex string", () => {
      const token = randomToken();

      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it("should generate unique tokens", () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 100; i++) {
        tokens.add(randomToken());
      }

      expect(tokens.size).toBe(100);
    });

    it("should handle zero bytes", () => {
      const token = randomToken(0);

      expect(token).toBe("");
    });
  });
});
