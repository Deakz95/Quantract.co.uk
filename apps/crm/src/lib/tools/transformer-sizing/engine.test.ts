import { describe, it, expect } from "vitest";
import { calculateTransformerSizing } from "./engine";

describe("calculateTransformerSizing", () => {
  it("calculates required kVA", () => {
    const result = calculateTransformerSizing({
      loadKw: 200, powerFactor: 0.85, primaryVoltage: 11000,
      secondaryVoltage: 400, growthAllowance: 0.2,
    });
    // kVA = 200/0.85 = 235.3
    expect(result.requiredKva).toBeCloseTo(235.3, 0);
    // With growth = 235.3 × 1.2 = 282.4
    expect(result.requiredKvaWithGrowth).toBeCloseTo(282.4, 0);
  });

  it("selects correct standard size", () => {
    const result = calculateTransformerSizing({
      loadKw: 200, powerFactor: 0.85, primaryVoltage: 11000,
      secondaryVoltage: 400, growthAllowance: 0.2,
    });
    // Need 282.4 kVA → next standard = 315 kVA
    expect(result.recommendedKva).toBe(315);
  });

  it("calculates primary current correctly", () => {
    const result = calculateTransformerSizing({
      loadKw: 200, powerFactor: 0.85, primaryVoltage: 11000,
      secondaryVoltage: 400, growthAllowance: 0.2,
    });
    // I_primary = 315000 / (√3 × 11000) = 315000/19052.6 = 16.5A
    expect(result.primaryCurrent).toBeCloseTo(16.5, 0);
  });

  it("calculates secondary current correctly", () => {
    const result = calculateTransformerSizing({
      loadKw: 200, powerFactor: 0.85, primaryVoltage: 11000,
      secondaryVoltage: 400, growthAllowance: 0.2,
    });
    // I_secondary = 315000 / (√3 × 400) = 315000/692.8 = 454.7A
    expect(result.secondaryCurrent).toBeCloseTo(454.7, 0);
  });

  it("calculates loading percentage", () => {
    const result = calculateTransformerSizing({
      loadKw: 200, powerFactor: 0.85, primaryVoltage: 11000,
      secondaryVoltage: 400, growthAllowance: 0.2,
    });
    // Loading = 235.3/315 × 100 = 74.7%
    expect(result.loadingPercent).toBeCloseTo(74.7, 0);
  });

  it("handles no growth allowance", () => {
    const result = calculateTransformerSizing({
      loadKw: 100, powerFactor: 0.9, primaryVoltage: 11000,
      secondaryVoltage: 400, growthAllowance: 0,
    });
    // kVA = 100/0.9 = 111.1 → next standard = 160
    expect(result.recommendedKva).toBe(160);
  });

  it("suggests protection ratings", () => {
    const result = calculateTransformerSizing({
      loadKw: 200, powerFactor: 0.85, primaryVoltage: 11000,
      secondaryVoltage: 400, growthAllowance: 0.2,
    });
    expect(result.suggestedPrimaryProtection).toBeGreaterThanOrEqual(16);
    expect(result.suggestedSecondaryProtection).toBeGreaterThanOrEqual(454);
  });
});
