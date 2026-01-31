import { describe, it, expect } from "vitest";
import { calculateMotorFla } from "./engine";

describe("calculateMotorFla", () => {
  it("calculates 3-phase motor FLA", () => {
    // 7.5kW, 3-phase, 400V, PF=0.85, η=0.90
    const result = calculateMotorFla({
      powerKw: 7.5, phase: "three", voltage: 400, powerFactor: 0.85, efficiency: 0.90,
    });
    // Input power = 7.5/0.90 = 8.333kW
    // FLA = 8333 / (√3 × 400 × 0.85) = 8333 / 588.9 = 14.15A
    expect(result.fla).toBeCloseTo(14.1, 0);
    expect(result.inputPowerKw).toBeCloseTo(8.33, 1);
  });

  it("calculates single-phase motor FLA", () => {
    // 2.2kW, single-phase, 230V, PF=0.85, η=0.85
    const result = calculateMotorFla({
      powerKw: 2.2, phase: "single", voltage: 230, powerFactor: 0.85, efficiency: 0.85,
    });
    // Input = 2.2/0.85 = 2.588kW
    // FLA = 2588 / (230 × 0.85) = 2588 / 195.5 = 13.24A
    expect(result.fla).toBeCloseTo(13.2, 0);
  });

  it("estimates starting current at 6× FLA", () => {
    const result = calculateMotorFla({
      powerKw: 7.5, phase: "three", voltage: 400, powerFactor: 0.85, efficiency: 0.90,
    });
    expect(result.startingCurrent).toBeCloseTo(result.fla * 6, 0);
  });

  it("suggests appropriate cable size", () => {
    const result = calculateMotorFla({
      powerKw: 7.5, phase: "three", voltage: 400, powerFactor: 0.85, efficiency: 0.90,
    });
    // FLA ≈ 14A, cable should be at least 1.5mm² (rated 18A)
    expect(result.suggestedCable).toBe(1.5);
  });

  it("suggests appropriate protection", () => {
    const result = calculateMotorFla({
      powerKw: 7.5, phase: "three", voltage: 400, powerFactor: 0.85, efficiency: 0.90,
    });
    // FLA ≈ 14A, next protection = 16A
    expect(result.suggestedProtection).toBe(16);
  });

  it("calculates apparent power", () => {
    const result = calculateMotorFla({
      powerKw: 10, phase: "three", voltage: 400, powerFactor: 0.80, efficiency: 0.90,
    });
    // Apparent = (10/0.90) / 0.80 = 13.89 kVA
    expect(result.apparentPowerKva).toBeCloseTo(13.89, 1);
  });

  it("handles large motor", () => {
    const result = calculateMotorFla({
      powerKw: 200, phase: "three", voltage: 400, powerFactor: 0.90, efficiency: 0.95,
    });
    expect(result.fla).toBeGreaterThan(300);
    expect(result.suggestedCable).toBeGreaterThanOrEqual(185);
  });
});
