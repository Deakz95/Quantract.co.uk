import { describe, it, expect } from "vitest";
import { calculateConduitFill } from "./engine";

describe("calculateConduitFill", () => {
  it("calculates basic fill for 20mm conduit with 3 cables", () => {
    // 20mm conduit, 3 × 2.5mm² T&E (overall diameter ~9mm)
    const result = calculateConduitFill({
      standard: "bs7671",
      conduitDiameter: 20,
      cables: [{ diameter: 9, quantity: 3 }],
    });
    // Conduit area = π × 10² = 314.16mm²
    // Cable area each = π × 4.5² = 63.62mm², total = 190.85mm²
    // Fill = 190.85/314.16 = 60.75%
    expect(result.conduitArea).toBeCloseTo(314.16, 0);
    expect(result.totalCableArea).toBeCloseTo(190.85, 0);
    expect(result.fillPercent).toBeCloseTo(60.75, 0);
    expect(result.maxFillPercent).toBe(45);
    expect(result.compliant).toBe(false); // Over 45%
  });

  it("passes for adequately sized conduit", () => {
    // 25mm conduit, 3 × 6mm diameter cables
    const result = calculateConduitFill({
      standard: "bs7671",
      conduitDiameter: 25,
      cables: [{ diameter: 6, quantity: 3 }],
    });
    // Conduit area = π × 12.5² = 490.87mm²
    // Cable area = 3 × π × 3² = 84.82mm²
    // Fill = 84.82/490.87 = 17.28%
    expect(result.fillPercent).toBeCloseTo(17.28, 0);
    expect(result.compliant).toBe(true);
  });

  it("applies NEC 2-conductor rule", () => {
    const result = calculateConduitFill({
      standard: "nec",
      conduitDiameter: 20,
      cables: [{ diameter: 8, quantity: 2 }],
    });
    expect(result.maxFillPercent).toBe(31);
    expect(result.totalCables).toBe(2);
  });

  it("applies NEC 3+ conductor rule", () => {
    const result = calculateConduitFill({
      standard: "nec",
      conduitDiameter: 25,
      cables: [{ diameter: 5, quantity: 4 }],
    });
    expect(result.maxFillPercent).toBe(40);
  });

  it("applies NEC single conductor rule", () => {
    const result = calculateConduitFill({
      standard: "nec",
      conduitDiameter: 20,
      cables: [{ diameter: 10, quantity: 1 }],
    });
    expect(result.maxFillPercent).toBe(53);
  });

  it("handles mixed cable sizes", () => {
    const result = calculateConduitFill({
      standard: "bs7671",
      conduitDiameter: 32,
      cables: [
        { diameter: 8, quantity: 2 },
        { diameter: 12, quantity: 1 },
      ],
    });
    expect(result.totalCables).toBe(3);
    // 2 × π×4² + 1 × π×6² = 100.53 + 113.10 = 213.63mm²
    // Conduit = π×16² = 804.25mm²
    // Fill = 26.56%
    expect(result.fillPercent).toBeCloseTo(26.56, 0);
    expect(result.compliant).toBe(true);
  });

  it("returns correct space factor description", () => {
    const bs = calculateConduitFill({
      standard: "bs7671",
      conduitDiameter: 20,
      cables: [{ diameter: 5, quantity: 1 }],
    });
    expect(bs.spaceFactor).toContain("BS 7671");

    const nec = calculateConduitFill({
      standard: "nec",
      conduitDiameter: 20,
      cables: [{ diameter: 5, quantity: 1 }],
    });
    expect(nec.spaceFactor).toContain("NEC");
  });
});
