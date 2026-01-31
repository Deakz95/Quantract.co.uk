import { describe, it, expect } from "vitest";
import { calculateLumenMethod } from "./engine";

describe("calculateLumenMethod", () => {
  it("calculates luminaire count for office", () => {
    // 500 lux, 10m × 8m, 5000lm fittings, CU=0.6, MF=0.8
    const result = calculateLumenMethod({
      targetLux: 500, roomLength: 10, roomWidth: 8,
      luminaireLumens: 5000, cu: 0.6, mf: 0.8,
    });
    // N = (500 × 80) / (5000 × 0.6 × 0.8) = 40000 / 2400 = 16.67 → 17
    expect(result.totalLumensRequired).toBeCloseTo(40000 / (0.6 * 0.8), 0);
    expect(result.luminaireCount).toBeGreaterThanOrEqual(17);
  });

  it("calculates room area correctly", () => {
    const result = calculateLumenMethod({
      targetLux: 300, roomLength: 12, roomWidth: 6,
      luminaireLumens: 3000, cu: 0.5, mf: 0.7,
    });
    expect(result.roomArea).toBe(72);
  });

  it("calculates room index when mounting height provided", () => {
    const result = calculateLumenMethod({
      targetLux: 500, roomLength: 10, roomWidth: 8,
      luminaireLumens: 5000, cu: 0.6, mf: 0.8,
      mountingHeight: 2.5,
    });
    // RI = (10 × 8) / (2.5 × (10 + 8)) = 80 / 45 = 1.78
    expect(result.roomIndex).toBeCloseTo(1.78, 1);
  });

  it("checks SHR compliance", () => {
    const result = calculateLumenMethod({
      targetLux: 300, roomLength: 20, roomWidth: 5,
      luminaireLumens: 10000, cu: 0.6, mf: 0.8,
      mountingHeight: 2.5, maxShr: 1.5,
    });
    // With few luminaires in narrow room, spacing may exceed SHR
    expect(result.actualShr).toBeDefined();
    expect(typeof result.shrCompliant).toBe("boolean");
  });

  it("achieves at least target lux", () => {
    const result = calculateLumenMethod({
      targetLux: 500, roomLength: 10, roomWidth: 8,
      luminaireLumens: 5000, cu: 0.6, mf: 0.8,
    });
    expect(result.achievedLux).toBeGreaterThanOrEqual(500);
  });

  it("returns grid layout", () => {
    const result = calculateLumenMethod({
      targetLux: 500, roomLength: 10, roomWidth: 8,
      luminaireLumens: 5000, cu: 0.6, mf: 0.8,
    });
    expect(result.gridRows).toBeGreaterThan(0);
    expect(result.gridCols).toBeGreaterThan(0);
    expect(result.gridRows * result.gridCols).toBeGreaterThanOrEqual(17);
  });

  it("handles small room", () => {
    const result = calculateLumenMethod({
      targetLux: 300, roomLength: 3, roomWidth: 3,
      luminaireLumens: 3000, cu: 0.6, mf: 0.8,
    });
    expect(result.luminaireCount).toBeGreaterThanOrEqual(1);
    expect(result.roomArea).toBe(9);
  });
});
