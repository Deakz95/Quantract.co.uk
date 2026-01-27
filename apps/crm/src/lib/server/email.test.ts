/**
 * Tests for email utilities
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { absoluteUrl } from "./email";

// Mock dependencies
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: "test-id" }),
    },
  })),
}));

vi.mock("./notificationPreferences", () => ({
  canSendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("./prisma", () => ({
  getPrisma: vi.fn().mockReturnValue({
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  }),
}));

describe("email", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("absoluteUrl", () => {
    it("should return empty string for empty input", () => {
      expect(absoluteUrl("")).toBe("");
    });

    it("should return http URL unchanged", () => {
      expect(absoluteUrl("http://example.com/path")).toBe("http://example.com/path");
    });

    it("should return https URL unchanged", () => {
      expect(absoluteUrl("https://example.com/path")).toBe("https://example.com/path");
    });

    it("should prepend APP_ORIGIN to relative path", () => {
      process.env.APP_ORIGIN = "https://app.example.com";

      expect(absoluteUrl("/some/path")).toBe("https://app.example.com/some/path");
    });

    it("should prepend NEXT_PUBLIC_APP_ORIGIN if APP_ORIGIN not set", () => {
      delete process.env.APP_ORIGIN;
      process.env.NEXT_PUBLIC_APP_ORIGIN = "https://public.example.com";

      expect(absoluteUrl("/path")).toBe("https://public.example.com/path");
    });

    it("should add leading slash if missing", () => {
      process.env.APP_ORIGIN = "https://app.example.com";

      expect(absoluteUrl("path/without/slash")).toBe("https://app.example.com/path/without/slash");
    });

    it("should not add double slash", () => {
      process.env.APP_ORIGIN = "https://app.example.com";

      expect(absoluteUrl("/path")).toBe("https://app.example.com/path");
    });

    it("should return path as-is when no origin configured", () => {
      delete process.env.APP_ORIGIN;
      delete process.env.NEXT_PUBLIC_APP_ORIGIN;

      expect(absoluteUrl("/fallback/path")).toBe("/fallback/path");
    });

    it("should prefer APP_ORIGIN over NEXT_PUBLIC_APP_ORIGIN", () => {
      process.env.APP_ORIGIN = "https://private.example.com";
      process.env.NEXT_PUBLIC_APP_ORIGIN = "https://public.example.com";

      expect(absoluteUrl("/test")).toBe("https://private.example.com/test");
    });
  });
});
