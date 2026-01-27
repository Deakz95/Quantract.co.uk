/**
 * Tests for auth module (legacy client-side session helpers)
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { setRoleCookie, clearRoleCookie, parseSession, type Role } from "./auth";

describe("auth", () => {
  const originalDocument = global.document;
  const originalWindow = global.window;
  let cookieValue = "";

  beforeEach(() => {
    cookieValue = "";

    // Mock document.cookie
    Object.defineProperty(global, "document", {
      value: {
        get cookie() {
          return cookieValue;
        },
        set cookie(value: string) {
          cookieValue = value;
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock window for localhost detection
    Object.defineProperty(global, "window", {
      value: {
        location: {
          hostname: "localhost",
        },
      },
      writable: true,
      configurable: true,
    });

    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    global.document = originalDocument;
    global.window = originalWindow;
    vi.restoreAllMocks();
  });

  describe("parseSession", () => {
    it("should return null for null input", () => {
      expect(parseSession(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(parseSession(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(parseSession("")).toBeNull();
    });

    it("should parse admin role", () => {
      const result = parseSession("role:admin");
      expect(result).toEqual({ role: "admin" });
    });

    it("should parse client role", () => {
      const result = parseSession("role:client");
      expect(result).toEqual({ role: "client" });
    });

    it("should parse engineer role", () => {
      const result = parseSession("role:engineer");
      expect(result).toEqual({ role: "engineer" });
    });

    it("should return null for invalid format", () => {
      expect(parseSession("invalid")).toBeNull();
      expect(parseSession("role:")).toBeNull();
      expect(parseSession(":admin")).toBeNull();
      expect(parseSession("admin")).toBeNull();
    });

    it("should return null for unknown role", () => {
      expect(parseSession("role:unknown")).toBeNull();
      expect(parseSession("role:superadmin")).toBeNull();
    });

    it("should be case sensitive", () => {
      expect(parseSession("role:Admin")).toBeNull();
      expect(parseSession("role:ADMIN")).toBeNull();
      expect(parseSession("Role:admin")).toBeNull();
    });
  });

  describe("setRoleCookie", () => {
    it("should set cookie for admin role in dev", () => {
      setRoleCookie("admin");
      expect(cookieValue).toContain("qt_session=role:admin");
    });

    it("should set cookie for client role in dev", () => {
      setRoleCookie("client");
      expect(cookieValue).toContain("qt_session=role:client");
    });

    it("should set cookie for engineer role in dev", () => {
      setRoleCookie("engineer");
      expect(cookieValue).toContain("qt_session=role:engineer");
    });

    it("should include path in cookie", () => {
      setRoleCookie("admin");
      expect(cookieValue).toContain("path=/");
    });

    it("should include samesite in cookie", () => {
      setRoleCookie("admin");
      expect(cookieValue).toContain("samesite=lax");
    });

    it("should include max-age in cookie", () => {
      setRoleCookie("admin");
      expect(cookieValue).toContain("max-age=86400");
    });

    it("should not set cookie when document is undefined", () => {
      const tempDoc = global.document;
      // @ts-expect-error - testing undefined case
      delete global.document;

      expect(() => setRoleCookie("admin")).not.toThrow();

      global.document = tempDoc;
    });
  });

  describe("clearRoleCookie", () => {
    it("should clear cookie by setting expired date", () => {
      setRoleCookie("admin");
      clearRoleCookie();
      expect(cookieValue).toContain("expires=Thu, 01 Jan 1970");
    });

    it("should set empty value", () => {
      clearRoleCookie();
      expect(cookieValue).toContain("qt_session=;");
    });

    it("should not throw when document is undefined", () => {
      const tempDoc = global.document;
      // @ts-expect-error - testing undefined case
      delete global.document;

      expect(() => clearRoleCookie()).not.toThrow();

      global.document = tempDoc;
    });
  });

  describe("Role type", () => {
    it("should accept valid roles", () => {
      const roles: Role[] = ["admin", "client", "engineer"];
      expect(roles).toHaveLength(3);
    });
  });
});
