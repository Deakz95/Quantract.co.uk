import { describe, it, expect } from "vitest";
import { calculateBoxFill } from "./engine";

describe("calculateBoxFill", () => {
  it("calculates BS 7671 box fill", () => {
    const result = calculateBoxFill({
      standard: "bs7671",
      boxVolume: 47,
      items: [
        { type: "conductor", conductorSize: 2.5, quantity: 6 },
        { type: "device", quantity: 1 },
      ],
    });
    // 6 × 6.5 + 1 × 10 = 49cm³, fill = 49/47 = 104.3%
    expect(result.totalVolume).toBeCloseTo(49, 0);
    expect(result.fillPercent).toBeCloseTo(104.26, 0);
    expect(result.compliant).toBe(false);
  });

  it("passes with larger box", () => {
    const result = calculateBoxFill({
      standard: "bs7271",
      boxVolume: 80,
      items: [
        { type: "conductor", conductorSize: 2.5, quantity: 6 },
        { type: "device", quantity: 1 },
      ],
    });
    expect(result.fillPercent).toBeLessThan(80);
    expect(result.compliant).toBe(true);
  });

  it("uses NEC volumes and limits", () => {
    const result = calculateBoxFill({
      standard: "nec",
      boxVolume: 20,
      items: [
        { type: "conductor", conductorSize: 2.5, quantity: 4 },
      ],
    });
    expect(result.maxFillPercent).toBe(100);
    expect(result.unit).toBe("in\u00b3");
  });

  it("handles clamps and grounds", () => {
    const result = calculateBoxFill({
      standard: "nec",
      boxVolume: 30,
      items: [
        { type: "conductor", conductorSize: 2.5, quantity: 4 },
        { type: "clamp", quantity: 1 },
        { type: "equipment_ground", quantity: 1 },
      ],
    });
    expect(result.itemBreakdown).toHaveLength(3);
  });

  it("defaults conductor size to 2.5mm\u00b2", () => {
    const result = calculateBoxFill({
      standard: "bs7271",
      boxVolume: 100,
      items: [{ type: "conductor", quantity: 2 }],
    });
    expect(result.totalVolume).toBeCloseTo(13, 0);
  });

  it("returns correct fill percentage at boundary", () => {
    const result = calculateBoxFill({
      standard: "bs7671",
      boxVolume: 100,
      items: [{ type: "conductor", conductorSize: 2.5, quantity: 12 }],
    });
    // 12 × 6.5 = 78, fill = 78%
    expect(result.fillPercent).toBeCloseTo(78, 0);
    expect(result.compliant).toBe(true); // Under 80%
  });
});
