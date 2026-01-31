import { describe, it, expect } from "vitest";
import { calculateAdiabatic } from "./engine";
import { adiabaticInputSchema } from "./schema";

describe("calculateAdiabatic", () => {
  it("calculates minimum CPC for typical domestic circuit", () => {
    // 1200A fault current, 0.4s disconnection, copper k=115
    const result = calculateAdiabatic({
      faultCurrent: 1200,
      disconnectionTime: 0.4,
      material: "copper",
    });
    // S = √(1200² × 0.4) / 115 = √(576000) / 115 = 758.95 / 115 = 6.60mm²
    expect(result.minimumCsa).toBeCloseTo(6.60, 1);
    expect(result.recommendedSize).toBe(10);
    expect(result.kFactor).toBe(115);
  });

  it("calculates for aluminium conductor", () => {
    const result = calculateAdiabatic({
      faultCurrent: 1200,
      disconnectionTime: 0.4,
      material: "aluminium",
    });
    // S = 758.95 / 76 = 9.99mm²
    expect(result.minimumCsa).toBeCloseTo(9.99, 1);
    expect(result.recommendedSize).toBe(10);
    expect(result.kFactor).toBe(76);
  });

  it("uses custom k factor when provided", () => {
    const result = calculateAdiabatic({
      faultCurrent: 1200,
      disconnectionTime: 0.4,
      material: "copper",
      kFactor: 143, // XLPE insulation
    });
    // S = 758.95 / 143 = 5.31mm²
    expect(result.minimumCsa).toBeCloseTo(5.31, 1);
    expect(result.recommendedSize).toBe(6);
    expect(result.kFactorSource).toContain("User-specified");
  });

  it("handles high fault current", () => {
    const result = calculateAdiabatic({
      faultCurrent: 10000,
      disconnectionTime: 0.1,
      material: "copper",
    });
    // S = √(10000² × 0.1) / 115 = √(10000000) / 115 = 3162.3 / 115 = 27.5mm²
    expect(result.minimumCsa).toBeCloseTo(27.5, 0);
    expect(result.recommendedSize).toBe(35);
  });

  it("handles very short disconnection time", () => {
    const result = calculateAdiabatic({
      faultCurrent: 3000,
      disconnectionTime: 0.01,
      material: "copper",
    });
    // S = √(3000² × 0.01) / 115 = √(90000) / 115 = 300 / 115 = 2.61mm²
    expect(result.minimumCsa).toBeCloseTo(2.61, 1);
    expect(result.recommendedSize).toBe(4);
  });

  it("returns null when no standard size fits", () => {
    const result = calculateAdiabatic({
      faultCurrent: 50000,
      disconnectionTime: 5,
      material: "copper",
    });
    // S = √(50000² × 5) / 115 = √(12500000000) / 115 = 111803 / 115 = 972mm²
    expect(result.recommendedSize).toBe(null);
  });

  it("calculates let-through energy correctly", () => {
    const result = calculateAdiabatic({
      faultCurrent: 1000,
      disconnectionTime: 1,
      material: "copper",
    });
    expect(result.letThroughEnergy).toBe(1000000); // 1000² × 1
  });
});

describe("adiabaticInputSchema", () => {
  it("rejects disconnection time over 5s", () => {
    const r = adiabaticInputSchema.safeParse({
      faultCurrent: 1000,
      disconnectionTime: 10,
      material: "copper",
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid input with defaults", () => {
    const r = adiabaticInputSchema.safeParse({
      faultCurrent: 1000,
      disconnectionTime: 0.4,
    });
    expect(r.success).toBe(true);
  });
});