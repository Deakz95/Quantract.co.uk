/**
 * Tests for env validation
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { assertEnv } from "./env";

describe("assertEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should pass when DATABASE_URL is set", () => {
    process.env.DATABASE_URL = "postgresql://test";
    expect(() => assertEnv()).not.toThrow();
  });

  it("should throw when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => assertEnv()).toThrow("Missing required environment variables: DATABASE_URL");
  });

  it("should not require optional variables", () => {
    process.env.DATABASE_URL = "postgresql://test";
    delete process.env.AUTH_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.INTERNAL_CRON_SECRET;
    expect(() => assertEnv()).not.toThrow();
  });

  it("should list all missing required variables", () => {
    delete process.env.DATABASE_URL;
    try {
      assertEnv();
    } catch (e) {
      expect((e as Error).message).toContain("DATABASE_URL");
    }
  });

  it("should pass with all variables set", () => {
    process.env.DATABASE_URL = "postgresql://test";
    process.env.AUTH_SECRET = "secret";
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.RESEND_API_KEY = "re_test";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.INTERNAL_CRON_SECRET = "cron_secret";
    expect(() => assertEnv()).not.toThrow();
  });
});
