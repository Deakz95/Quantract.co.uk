/**
 * Tests for MFA utilities (pure functions only)
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  generateMfaSecret,
  generateBackupCodes,
  hashBackupCode,
} from "./mfa";

// Mock Prisma - these tests focus on pure functions
vi.mock("@/lib/server/prisma", () => ({
  getPrisma: vi.fn().mockReturnValue(null),
}));

describe("mfa", () => {
  describe("generateMfaSecret", () => {
    it("should generate a base32 secret", () => {
      const secret = generateMfaSecret();

      // Base32 characters only
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it("should generate secrets of appropriate length", () => {
      const secret = generateMfaSecret();

      // 20 bytes = 160 bits = 32 base32 chars (with no padding)
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });

    it("should generate unique secrets each time", () => {
      const secrets = new Set<string>();

      for (let i = 0; i < 100; i++) {
        secrets.add(generateMfaSecret());
      }

      expect(secrets.size).toBe(100);
    });

    it("should not contain padding characters", () => {
      const secret = generateMfaSecret();

      expect(secret).not.toContain("=");
    });
  });

  describe("generateBackupCodes", () => {
    it("should generate 10 codes by default", () => {
      const codes = generateBackupCodes();

      expect(codes).toHaveLength(10);
    });

    it("should generate specified number of codes", () => {
      const codes = generateBackupCodes(5);

      expect(codes).toHaveLength(5);
    });

    it("should generate 8-character uppercase hex codes", () => {
      const codes = generateBackupCodes();

      for (const code of codes) {
        expect(code).toMatch(/^[A-F0-9]{8}$/);
      }
    });

    it("should generate unique codes", () => {
      const codes = generateBackupCodes(100);
      const unique = new Set(codes);

      expect(unique.size).toBe(100);
    });

    it("should handle zero count", () => {
      const codes = generateBackupCodes(0);

      expect(codes).toHaveLength(0);
    });
  });

  describe("hashBackupCode", () => {
    it("should return SHA256 hash", () => {
      const hash = hashBackupCode("ABCD1234");

      // SHA256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should be case insensitive", () => {
      const hash1 = hashBackupCode("ABCD1234");
      const hash2 = hashBackupCode("abcd1234");

      expect(hash1).toBe(hash2);
    });

    it("should produce consistent hashes", () => {
      const hash1 = hashBackupCode("TEST1234");
      const hash2 = hashBackupCode("TEST1234");

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different codes", () => {
      const hash1 = hashBackupCode("CODE1111");
      const hash2 = hashBackupCode("CODE2222");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", () => {
      const hash = hashBackupCode("");

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
