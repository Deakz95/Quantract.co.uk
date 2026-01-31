import { describe, it, expect } from "vitest";
import { calculatePowerFactor } from "./engine";

describe("calculatePowerFactor", () => {
  it("calculates required kVAR", () => {
    // 200kW at PF 0.75 → target 0.95
    const result = calculatePowerFactor({
      activeKw: 200, currentPf: 0.75, targetPf: 0.95, voltage: 400,
    });
    // tan(acos(0.75)) = 0.8819, tan(acos(0.95)) = 0.3287
    // kVAR = 200 × (0.8819 - 0.3287) = 110.6
    expect(result.requiredKvar).toBeCloseTo(110.6, 0);
  });

  it("calculates current reduction", () => {
    const result = calculatePowerFactor({
      activeKw: 200, currentPf: 0.75, targetPf: 0.95, voltage: 400,
    });
    // Before: kVA = 200/0.75 = 266.7, I = 266700/(√3×400) = 385.1A
    // After: kVA = 200/0.95 = 210.5, I = 210500/(√3×400) = 304.0A
    expect(result.currentAmps).toBeCloseTo(385.1, 0);
    expect(result.correctedAmps).toBeCloseTo(304.0, 0);
    expect(result.currentReduction).toBeGreaterThan(20);
  });

  it("calculates kVA reduction", () => {
    const result = calculatePowerFactor({
      activeKw: 200, currentPf: 0.75, targetPf: 0.95, voltage: 400,
    });
    // 266.7 - 210.5 = 56.1 kVA
    expect(result.kvaReduction).toBeCloseTo(56.1, 0);
  });

  it("handles unity power factor target", () => {
    const result = calculatePowerFactor({
      activeKw: 100, currentPf: 0.8, targetPf: 1.0, voltage: 400,
    });
    // At PF=1.0, tan(acos(1)) = 0, so correctedKvar = 0
    expect(result.correctedKvar).toBeCloseTo(0, 1);
    expect(result.correctedKva).toBeCloseTo(100, 0);
  });

  it("handles already good power factor", () => {
    const result = calculatePowerFactor({
      activeKw: 100, currentPf: 0.95, targetPf: 0.99, voltage: 400,
    });
    expect(result.requiredKvar).toBeGreaterThan(0);
    expect(result.requiredKvar).toBeLessThan(20);
  });

  it("returns reactive power values", () => {
    const result = calculatePowerFactor({
      activeKw: 200, currentPf: 0.75, targetPf: 0.95, voltage: 400,
    });
    expect(result.currentKvar).toBeCloseTo(176.4, 0);
    expect(result.correctedKvar).toBeCloseTo(65.7, 0);
  });
});
