/**
 * Tests for permissions module
 */
import { describe, expect, it } from "vitest";
import { hasCapability, ROLE_DEFAULTS, type Capability } from "./permissions";

describe("permissions", () => {
  describe("ROLE_DEFAULTS", () => {
    it("should have ADMIN role with all capabilities", () => {
      expect(ROLE_DEFAULTS.ADMIN).toContain("billing.view");
      expect(ROLE_DEFAULTS.ADMIN).toContain("billing.manage");
      expect(ROLE_DEFAULTS.ADMIN).toContain("invoices.view");
      expect(ROLE_DEFAULTS.ADMIN).toContain("invoices.manage");
      expect(ROLE_DEFAULTS.ADMIN).toContain("planner.manage");
      expect(ROLE_DEFAULTS.ADMIN).toContain("expenses.manage");
      expect(ROLE_DEFAULTS.ADMIN).toContain("suppliers.manage");
      expect(ROLE_DEFAULTS.ADMIN).toContain("settings.manage");
      expect(ROLE_DEFAULTS.ADMIN).toContain("users.manage");
    });

    it("should have OFFICE role with limited capabilities", () => {
      expect(ROLE_DEFAULTS.OFFICE).toContain("invoices.view");
      expect(ROLE_DEFAULTS.OFFICE).toContain("planner.manage");
      expect(ROLE_DEFAULTS.OFFICE).toContain("expenses.manage");
      expect(ROLE_DEFAULTS.OFFICE).toContain("suppliers.manage");
      expect(ROLE_DEFAULTS.OFFICE).not.toContain("billing.manage");
      expect(ROLE_DEFAULTS.OFFICE).not.toContain("users.manage");
    });

    it("should have ENGINEER role with no capabilities", () => {
      expect(ROLE_DEFAULTS.ENGINEER).toEqual([]);
    });

    it("should have FINANCE role with financial capabilities", () => {
      expect(ROLE_DEFAULTS.FINANCE).toContain("invoices.view");
      expect(ROLE_DEFAULTS.FINANCE).toContain("invoices.manage");
      expect(ROLE_DEFAULTS.FINANCE).toContain("expenses.manage");
      expect(ROLE_DEFAULTS.FINANCE).toContain("billing.view");
      expect(ROLE_DEFAULTS.FINANCE).not.toContain("billing.manage");
      expect(ROLE_DEFAULTS.FINANCE).not.toContain("users.manage");
    });
  });

  describe("hasCapability", () => {
    it("should return true if capability is in user caps array", () => {
      const userCaps: Capability[] = ["invoices.view"];
      expect(hasCapability("ENGINEER", userCaps, "invoices.view")).toBe(true);
    });

    it("should return true if capability is in role defaults", () => {
      const userCaps: Capability[] = [];
      expect(hasCapability("ADMIN", userCaps, "billing.manage")).toBe(true);
    });

    it("should return false if capability is not granted", () => {
      const userCaps: Capability[] = [];
      expect(hasCapability("ENGINEER", userCaps, "billing.manage")).toBe(false);
    });

    it("should prioritize user caps over role defaults", () => {
      // Even if ENGINEER has no defaults, explicit caps work
      const userCaps: Capability[] = ["billing.manage"];
      expect(hasCapability("ENGINEER", userCaps, "billing.manage")).toBe(true);
    });

    it("should handle unknown role", () => {
      const userCaps: Capability[] = [];
      expect(hasCapability("UNKNOWN_ROLE", userCaps, "billing.view")).toBe(false);
    });

    it("should handle unknown role with explicit caps", () => {
      const userCaps: Capability[] = ["billing.view"];
      expect(hasCapability("UNKNOWN_ROLE", userCaps, "billing.view")).toBe(true);
    });

    it("should check all ADMIN capabilities", () => {
      const adminCaps: Capability[] = [
        "billing.view",
        "billing.manage",
        "invoices.view",
        "invoices.manage",
        "planner.manage",
        "expenses.manage",
        "suppliers.manage",
        "settings.manage",
        "users.manage",
      ];

      for (const cap of adminCaps) {
        expect(hasCapability("ADMIN", [], cap)).toBe(true);
      }
    });

    it("should check OFFICE cannot manage billing", () => {
      expect(hasCapability("OFFICE", [], "billing.manage")).toBe(false);
    });

    it("should check OFFICE cannot manage users", () => {
      expect(hasCapability("OFFICE", [], "users.manage")).toBe(false);
    });

    it("should check FINANCE cannot manage settings", () => {
      expect(hasCapability("FINANCE", [], "settings.manage")).toBe(false);
    });

    it("should allow overriding role defaults with explicit caps", () => {
      // FINANCE doesn't have settings.manage by default
      expect(hasCapability("FINANCE", [], "settings.manage")).toBe(false);
      // But can be granted explicitly
      expect(hasCapability("FINANCE", ["settings.manage"], "settings.manage")).toBe(true);
    });
  });
});
