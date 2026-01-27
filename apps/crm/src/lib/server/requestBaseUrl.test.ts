/**
 * Tests for requestBaseUrl utility
 */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { requestBaseUrl } from "./requestBaseUrl";

describe("requestBaseUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return localhost:3000 by default", () => {
    expect(requestBaseUrl()).toBe("http://localhost:3000");
  });

  it("should use NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

    expect(requestBaseUrl()).toBe("https://app.example.com");
  });

  it("should use APP_URL when NEXT_PUBLIC_APP_URL not set", () => {
    process.env.APP_URL = "https://app2.example.com";

    expect(requestBaseUrl()).toBe("https://app2.example.com");
  });

  it("should use VERCEL_URL when other env vars not set", () => {
    process.env.VERCEL_URL = "my-app.vercel.app";

    expect(requestBaseUrl()).toBe("https://my-app.vercel.app");
  });

  it("should prefer NEXT_PUBLIC_APP_URL over APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://preferred.com";
    process.env.APP_URL = "https://fallback.com";

    expect(requestBaseUrl()).toBe("https://preferred.com");
  });

  it("should prefer APP_URL over VERCEL_URL", () => {
    process.env.APP_URL = "https://preferred.com";
    process.env.VERCEL_URL = "fallback.vercel.app";

    expect(requestBaseUrl()).toBe("https://preferred.com");
  });

  it("should strip trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";

    expect(requestBaseUrl()).toBe("https://app.example.com");
  });

  it("should add https:// to VERCEL_URL", () => {
    process.env.VERCEL_URL = "my-app.vercel.app/";

    expect(requestBaseUrl()).toBe("https://my-app.vercel.app");
  });

  it("should preserve http:// when specified", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:8080";

    expect(requestBaseUrl()).toBe("http://localhost:8080");
  });

  it("should preserve https:// when specified", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://secure.example.com";

    expect(requestBaseUrl()).toBe("https://secure.example.com");
  });

  it("should handle whitespace in env var", () => {
    process.env.NEXT_PUBLIC_APP_URL = "  https://app.example.com  ";

    expect(requestBaseUrl()).toBe("https://app.example.com");
  });

  it("should add https when protocol missing", () => {
    process.env.NEXT_PUBLIC_APP_URL = "app.example.com";

    expect(requestBaseUrl()).toBe("https://app.example.com");
  });
});
