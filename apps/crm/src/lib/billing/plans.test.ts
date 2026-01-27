/**
 * Tests for billing plans and entitlements
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  hasAdminBypass,
  normalizePlan,
  getPlanDefinition,
  getPlanLimits,
  getAllPlans,
  getTrialStatus,
  getLimit,
  hasEntitlement,
  isWithinLimit,
  getRemainingCapacity,
  MODULE_PRICING,
  type OrgEntitlements,
  type PlanTier,
  type Module,
} from "./plans";

describe("billing/plans", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ADMIN_BYPASS_EMAILS;
    delete process.env.NEXT_PUBLIC_ADMIN_BYPASS_EMAILS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("hasAdminBypass", () => {
    it("should return false for null email", () => {
      expect(hasAdminBypass(null)).toBe(false);
    });

    it("should return false for undefined email", () => {
      expect(hasAdminBypass(undefined)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(hasAdminBypass("")).toBe(false);
    });

    it("should return false when no bypass emails configured", () => {
      expect(hasAdminBypass("admin@example.com")).toBe(false);
    });

    it("should return true when email is in bypass list", () => {
      process.env.ADMIN_BYPASS_EMAILS = "admin@example.com,super@test.com";

      expect(hasAdminBypass("admin@example.com")).toBe(true);
    });

    it("should be case insensitive", () => {
      process.env.ADMIN_BYPASS_EMAILS = "Admin@Example.com";

      expect(hasAdminBypass("admin@example.com")).toBe(true);
      expect(hasAdminBypass("ADMIN@EXAMPLE.COM")).toBe(true);
    });

    it("should handle whitespace in bypass list", () => {
      process.env.ADMIN_BYPASS_EMAILS = " admin@example.com , test@test.com ";

      expect(hasAdminBypass("admin@example.com")).toBe(true);
    });

    it("should check NEXT_PUBLIC_ADMIN_BYPASS_EMAILS as fallback", () => {
      process.env.NEXT_PUBLIC_ADMIN_BYPASS_EMAILS = "public@example.com";

      expect(hasAdminBypass("public@example.com")).toBe(true);
    });

    it("should prefer ADMIN_BYPASS_EMAILS over public", () => {
      process.env.ADMIN_BYPASS_EMAILS = "private@example.com";
      process.env.NEXT_PUBLIC_ADMIN_BYPASS_EMAILS = "public@example.com";

      expect(hasAdminBypass("private@example.com")).toBe(true);
      expect(hasAdminBypass("public@example.com")).toBe(false);
    });
  });

  describe("normalizePlan", () => {
    it("should return trial for null", () => {
      expect(normalizePlan(null)).toBe("trial");
    });

    it("should return trial for undefined", () => {
      expect(normalizePlan(undefined)).toBe("trial");
    });

    it("should return trial for empty string", () => {
      expect(normalizePlan("")).toBe("trial");
    });

    it("should map 'free' to trial", () => {
      expect(normalizePlan("free")).toBe("trial");
    });

    it("should map 'solo' to core", () => {
      expect(normalizePlan("solo")).toBe("core");
    });

    it("should map 'team' to pro", () => {
      expect(normalizePlan("team")).toBe("pro");
    });

    it("should return pro for 'pro'", () => {
      expect(normalizePlan("pro")).toBe("pro");
    });

    it("should return core for 'core'", () => {
      expect(normalizePlan("core")).toBe("core");
    });

    it("should return enterprise for 'enterprise'", () => {
      expect(normalizePlan("enterprise")).toBe("enterprise");
    });

    it("should be case insensitive", () => {
      expect(normalizePlan("PRO")).toBe("pro");
      expect(normalizePlan("Enterprise")).toBe("enterprise");
    });

    it("should return trial for unknown plans", () => {
      expect(normalizePlan("unknown")).toBe("trial");
      expect(normalizePlan("premium")).toBe("trial");
    });
  });

  describe("getPlanDefinition", () => {
    it("should return trial plan by default", () => {
      const plan = getPlanDefinition(null);

      expect(plan.id).toBe("trial");
      expect(plan.price).toBe(0);
    });

    it("should return correct plan for tier", () => {
      const pro = getPlanDefinition("pro");

      expect(pro.id).toBe("pro");
      expect(pro.price).toBe(79);
    });

    it("should return enterprise for bypass email", () => {
      process.env.ADMIN_BYPASS_EMAILS = "admin@test.com";

      const plan = getPlanDefinition("trial", "admin@test.com");

      expect(plan.id).toBe("enterprise");
    });
  });

  describe("getPlanLimits", () => {
    it("should return trial limits by default", () => {
      const limits = getPlanLimits(null);

      expect(limits.trialDays).toBe(14);
      expect(limits.maxJobs).toBe(50);
    });

    it("should return unlimited limits for bypass email", () => {
      process.env.ADMIN_BYPASS_EMAILS = "admin@test.com";

      const limits = getPlanLimits("trial", "admin@test.com");

      expect(limits.maxJobs).toBe(Infinity);
      expect(limits.includedUsers).toBe(Infinity);
    });
  });

  describe("getAllPlans", () => {
    it("should return all plan definitions", () => {
      const plans = getAllPlans();

      expect(plans).toHaveLength(4);
      expect(plans.map((p) => p.id)).toEqual(["trial", "core", "pro", "enterprise"]);
    });

    it("should include labels for all plans", () => {
      const plans = getAllPlans();

      for (const plan of plans) {
        expect(plan.label).toBeTruthy();
        expect(plan.description).toBeTruthy();
      }
    });
  });

  describe("getTrialStatus", () => {
    it("should return non-trial status for pro plan", () => {
      const status = getTrialStatus("pro", null);

      expect(status.isTrialPlan).toBe(false);
      expect(status.daysRemaining).toBeNull();
    });

    it("should return trial status with full days when not started", () => {
      const status = getTrialStatus("trial", null);

      expect(status.isTrialPlan).toBe(true);
      expect(status.daysRemaining).toBe(14);
      expect(status.isExpired).toBe(false);
    });

    it("should calculate days remaining for active trial", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Started 7 days ago

      const status = getTrialStatus("trial", startDate);

      expect(status.isTrialPlan).toBe(true);
      expect(status.daysRemaining).toBeLessThanOrEqual(7);
      expect(status.isExpired).toBe(false);
    });

    it("should mark expired trial", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 20); // Started 20 days ago

      const status = getTrialStatus("trial", startDate);

      expect(status.isTrialPlan).toBe(true);
      expect(status.isExpired).toBe(true);
      expect(status.daysRemaining).toBe(0);
    });

    it("should handle string date", () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);

      const status = getTrialStatus("trial", startDate.toISOString());

      expect(status.isTrialPlan).toBe(true);
      expect(status.daysRemaining).toBeLessThanOrEqual(9);
    });

    it("should return non-trial for bypass email", () => {
      process.env.ADMIN_BYPASS_EMAILS = "admin@test.com";

      const status = getTrialStatus("trial", null, "admin@test.com");

      expect(status.isTrialPlan).toBe(false);
      expect(status.isExpired).toBe(false);
    });
  });

  describe("getLimit", () => {
    const baseEntitlements: OrgEntitlements = {
      plan: "core",
      enabledModules: [],
      extraUsers: 0,
      extraEntities: 0,
      extraStorageMB: 0,
    };

    it("should return user limit from plan", () => {
      const limit = getLimit(baseEntitlements, "users");

      expect(limit).toBe(3); // Core includes 3 users
    });

    it("should add extra users to limit", () => {
      const entitlements = { ...baseEntitlements, extraUsers: 5 };

      const limit = getLimit(entitlements, "users");

      expect(limit).toBe(8); // 3 + 5
    });

    it("should cap legal entities at plan max", () => {
      const entitlements = { ...baseEntitlements, extraEntities: 10 };

      const limit = getLimit(entitlements, "legal_entities");

      expect(limit).toBeLessThanOrEqual(5); // Core max is 5
    });

    it("should add module invoice limit for core with CRM", () => {
      const entitlements: OrgEntitlements = {
        ...baseEntitlements,
        enabledModules: ["crm"],
      };

      const limit = getLimit(entitlements, "invoices_per_month");

      expect(limit).toBe(300); // From CRM module
    });

    it("should add module certificate limit for core with certificates", () => {
      const entitlements: OrgEntitlements = {
        ...baseEntitlements,
        enabledModules: ["certificates"],
      };

      const limit = getLimit(entitlements, "certificates_per_month");

      expect(limit).toBe(150); // From certificates module
    });

    it("should return true for included module", () => {
      const proEntitlements: OrgEntitlements = {
        plan: "pro",
        enabledModules: [],
        extraUsers: 0,
        extraEntities: 0,
        extraStorageMB: 0,
      };

      expect(getLimit(proEntitlements, "module_crm")).toBe(true);
    });

    it("should return true for enabled module", () => {
      const entitlements: OrgEntitlements = {
        ...baseEntitlements,
        enabledModules: ["portal"],
      };

      expect(getLimit(entitlements, "module_portal")).toBe(true);
    });

    it("should return Infinity for admin bypass", () => {
      process.env.ADMIN_BYPASS_EMAILS = "admin@test.com";

      const limit = getLimit(baseEntitlements, "users", "admin@test.com");

      expect(limit).toBe(Infinity);
    });

    it("should return true for features with admin bypass", () => {
      process.env.ADMIN_BYPASS_EMAILS = "admin@test.com";

      const limit = getLimit(baseEntitlements, "feature_dedicated_db", "admin@test.com");

      expect(limit).toBe(true);
    });
  });

  describe("hasEntitlement", () => {
    const baseEntitlements: OrgEntitlements = {
      plan: "core",
      enabledModules: [],
      extraUsers: 0,
      extraEntities: 0,
      extraStorageMB: 0,
    };

    it("should return true for numeric entitlement > 0", () => {
      expect(hasEntitlement(baseEntitlements, "users")).toBe(true);
    });

    it("should return false for disabled module", () => {
      expect(hasEntitlement(baseEntitlements, "module_crm")).toBe(false);
    });

    it("should return true for enabled module", () => {
      const entitlements = { ...baseEntitlements, enabledModules: ["crm"] as Module[] };

      expect(hasEntitlement(entitlements, "module_crm")).toBe(true);
    });
  });

  describe("isWithinLimit", () => {
    const baseEntitlements: OrgEntitlements = {
      plan: "core",
      enabledModules: [],
      extraUsers: 0,
      extraEntities: 0,
      extraStorageMB: 0,
    };

    it("should return true when under limit", () => {
      expect(isWithinLimit(baseEntitlements, "users", 2)).toBe(true);
    });

    it("should return false when at limit", () => {
      expect(isWithinLimit(baseEntitlements, "users", 3)).toBe(false);
    });

    it("should return false when over limit", () => {
      expect(isWithinLimit(baseEntitlements, "users", 5)).toBe(false);
    });

    it("should return true for admin bypass", () => {
      process.env.ADMIN_BYPASS_EMAILS = "admin@test.com";

      expect(isWithinLimit(baseEntitlements, "users", 1000, "admin@test.com")).toBe(true);
    });
  });

  describe("getRemainingCapacity", () => {
    const baseEntitlements: OrgEntitlements = {
      plan: "core",
      enabledModules: [],
      extraUsers: 0,
      extraEntities: 0,
      extraStorageMB: 0,
    };

    it("should calculate remaining capacity", () => {
      expect(getRemainingCapacity(baseEntitlements, "users", 1)).toBe(2);
    });

    it("should return 0 when at limit", () => {
      expect(getRemainingCapacity(baseEntitlements, "users", 3)).toBe(0);
    });

    it("should return 0 when over limit", () => {
      expect(getRemainingCapacity(baseEntitlements, "users", 5)).toBe(0);
    });

    it("should return Infinity for admin bypass", () => {
      process.env.ADMIN_BYPASS_EMAILS = "admin@test.com";

      expect(getRemainingCapacity(baseEntitlements, "users", 100, "admin@test.com")).toBe(Infinity);
    });
  });

  describe("MODULE_PRICING", () => {
    it("should have CRM module", () => {
      expect(MODULE_PRICING.crm.price).toBe(19);
      expect(MODULE_PRICING.crm.label).toBe("CRM Module");
    });

    it("should have Certificates module", () => {
      expect(MODULE_PRICING.certificates.price).toBe(15);
    });

    it("should have Portal module", () => {
      expect(MODULE_PRICING.portal.price).toBe(7);
    });

    it("should have Tools module", () => {
      expect(MODULE_PRICING.tools.price).toBe(7);
    });
  });
});
