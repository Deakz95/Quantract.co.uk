import { describe, it, expect } from "vitest";
import { calculateHighBay } from "./engine";
import { highBayInputSchema } from "./schema";

const base = {
  areaLength: 40, areaWidth: 20, mountingHeight: 8,
  targetLux: 300, luminaireLumens: 30000, targetShr: 1.0, cu: 0.5, mf: 0.7,
};

describe("calculateHighBay", () => {
  it("calculates correct luminaire count for a standard warehouse", () => {
    const result = calculateHighBay(base);
    expect(result.area).toBe(800);
    expect(result.luminaireCount).toBeGreaterThanOrEqual(23);
    expect(result.gridRows * result.gridCols).toBe(result.luminaireCount);
  });

  it("produces grid that approximates room aspect ratio", () => {
    const result = calculateHighBay(base);
    const gridRatio = result.gridCols / result.gridRows;
    const roomRatio = base.areaLength / base.areaWidth;
    expect(gridRatio).toBeGreaterThan(roomRatio * 0.5);
    expect(gridRatio).toBeLessThan(roomRatio * 2);
  });

  it("recommends narrow-beam optics above 12 m", () => {
    const r = calculateHighBay({ ...base, mountingHeight: 14 });
    expect(r.recommendations.some((s: string) => s.includes("narrow-beam"))).toBe(true);
  });

  it("warns when achieved lux exceeds target by 30%+", () => {
    const r = calculateHighBay({ ...base, targetLux: 100, luminaireLumens: 50000 });
    expect(r.achievedLux).toBeGreaterThan(130);
    expect(r.recommendations.some((s: string) => s.includes("exceeds target"))).toBe(true);
  });

  it("handles small room with single luminaire", () => {
    const r = calculateHighBay({
      areaLength: 3, areaWidth: 3, mountingHeight: 4,
      targetLux: 200, luminaireLumens: 30000, targetShr: 1.0, cu: 0.5, mf: 0.7,
    });
    expect(r.luminaireCount).toBe(1);
    expect(r.gridRows).toBe(1);
  });

  it("returns valid spacing for a square room", () => {
    const r = calculateHighBay({ ...base, areaLength: 20, areaWidth: 20 });
    expect(r.spacingLength).toBeGreaterThan(0);
    expect(r.spacingWidth).toBeGreaterThan(0);
  });
});

describe("highBayInputSchema", () => {
  it("applies defaults correctly", () => {
    const p = highBayInputSchema.parse({ areaLength: 30, areaWidth: 15, mountingHeight: 8 });
    expect(p.targetLux).toBe(300);
    expect(p.cu).toBe(0.5);
    expect(p.mf).toBe(0.7);
  });
});
