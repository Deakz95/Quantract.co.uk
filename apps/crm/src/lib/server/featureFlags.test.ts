import { describe, it, expect } from "vitest";
import { isFeatureEnabled, getEnabledFeatures } from "./featureFlags";

describe("featureFlags", () => {
  it("trial plan has portal_timeline and portal_troubleshooter only", () => {
    expect(isFeatureEnabled("trial", "portal_timeline")).toBe(true);
    expect(isFeatureEnabled("trial", "portal_troubleshooter")).toBe(true);
    expect(isFeatureEnabled("trial", "ai_estimator_photo")).toBe(false);
    expect(isFeatureEnabled("trial", "remote_assist")).toBe(false);
    expect(isFeatureEnabled("trial", "truck_inventory")).toBe(false);
    expect(isFeatureEnabled("trial", "maintenance_alerts")).toBe(false);
  });

  it("core plan adds lead_scoring and maintenance_alerts", () => {
    expect(isFeatureEnabled("core", "lead_scoring")).toBe(true);
    expect(isFeatureEnabled("core", "maintenance_alerts")).toBe(true);
    expect(isFeatureEnabled("core", "truck_inventory")).toBe(false);
    expect(isFeatureEnabled("core", "ai_estimator_photo")).toBe(false);
  });

  it("pro plan enables all features", () => {
    expect(isFeatureEnabled("pro", "ai_estimator_photo")).toBe(true);
    expect(isFeatureEnabled("pro", "remote_assist")).toBe(true);
    expect(isFeatureEnabled("pro", "truck_inventory")).toBe(true);
    expect(isFeatureEnabled("pro", "maintenance_alerts")).toBe(true);
    expect(isFeatureEnabled("pro", "lead_scoring")).toBe(true);
  });

  it("null/undefined plan defaults to trial", () => {
    expect(isFeatureEnabled(null, "remote_assist")).toBe(false);
    expect(isFeatureEnabled(undefined, "portal_timeline")).toBe(true);
  });

  it("plan name normalization works", () => {
    expect(isFeatureEnabled("Pro Plan", "remote_assist")).toBe(true);
    expect(isFeatureEnabled("ENTERPRISE", "remote_assist")).toBe(true);
    expect(isFeatureEnabled("Core Monthly", "maintenance_alerts")).toBe(true);
  });

  it("getEnabledFeatures returns correct list", () => {
    const trial = getEnabledFeatures("trial");
    expect(trial).toHaveLength(2);
    expect(trial).toContain("portal_timeline");

    const pro = getEnabledFeatures("pro");
    expect(pro).toHaveLength(7);
  });
});
