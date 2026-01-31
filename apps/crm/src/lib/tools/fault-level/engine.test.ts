import { describe, it, expect } from "vitest";
import { calculateFaultLevel } from "./engine";

describe("calculateFaultLevel", () => {
  it("calculates earth fault current from Zs", () => {
    // 230V, Zs = 0.35Ω
    const result = calculateFaultLevel({ voltage: 230, zs: 0.35 });
    // Ipf = 230 / 0.35 = 657.1A
    expect(result.pfc_earth).toBeCloseTo(657.1, 0);
  });

  it("estimates line-neutral fault current", () => {
    const result = calculateFaultLevel({ voltage: 230, zs: 0.35 });
    // Zpn ≈ 0.35 × 0.8 = 0.28
    // Ipf = 230 / 0.28 = 821.4A
    expect(result.pfc_neutral).toBeCloseTo(821.4, 0);
  });

  it("uses explicit Zpn when provided", () => {
    const result = calculateFaultLevel({ voltage: 230, zs: 0.35, zpn: 0.25 });
    // Ipf = 230 / 0.25 = 920A
    expect(result.pfc_neutral).toBeCloseTo(920, 0);
  });

  it("calculates transformer fault level", () => {
    const result = calculateFaultLevel({
      voltage: 400, zs: 0.2,
      transformerKva: 500, transformerImpedancePercent: 5,
    });
    // Isc = 500000 / (√3 × 400 × 0.05) = 500000/34.64 = 14434A
    expect(result.pfc_transformer).toBeCloseTo(14434, -1);
  });

  it("warns when PFC exceeds 6kA", () => {
    const result = calculateFaultLevel({ voltage: 230, zs: 0.03 });
    // Ipf = 230/0.03 = 7667A
    expect(result.pfc_earth).toBeCloseTo(7667, -1);
    expect(result.warning).toContain("6kA");
  });

  it("warns when PFC exceeds 10kA", () => {
    const result = calculateFaultLevel({ voltage: 230, zs: 0.02 });
    // Ipf = 230/0.02 = 11500A
    expect(result.warning).toContain("10kA");
  });

  it("no warning for normal domestic values", () => {
    const result = calculateFaultLevel({ voltage: 230, zs: 0.8 });
    expect(result.warning).toBeNull();
  });

  it("handles 3-phase voltage correctly", () => {
    const result = calculateFaultLevel({ voltage: 400, zs: 1.0 });
    // Uo = 400/√3 = 231V
    // Ipf = 231/1.0 = 231A
    expect(result.pfc_earth).toBeCloseTo(231, 0);
  });
});
