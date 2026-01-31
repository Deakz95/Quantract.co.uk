import { describe, it, expect } from "vitest";
import { calculateCableSizing } from "./engine";
import { cableSizingInputSchema } from "./schema";

describe("calculateCableSizing", () => {
  it("selects correct cable for 32A ring main", () => {
    const result = calculateCableSizing({
      designCurrent: 32,
      cableType: "twin-earth",
      ca: 1.0,
      cg: 1.0,
      ci: 1.0,
      circuitType: "power",
      supplyVoltage: 230,
    });
    // 4mm² T&E has 32A rating, exactly meets 32A design current
    expect(result.recommendedSize).toBe(4);
    expect(result.requiredCcc).toBe(32);
  });

  it("upsizes cable when correction factors applied", () => {
    const result = calculateCableSizing({
      designCurrent: 32,
      cableType: "twin-earth",
      ca: 0.94, // 35°C ambient
      cg: 0.8,  // 2 cables grouped
      ci: 1.0,
      circuitType: "power",
      supplyVoltage: 230,
    });
    expect(result.requiredCcc).toBeCloseTo(42.6, 0);
    expect(result.recommendedSize).toBe(10);
  });

  it("checks voltage drop when length provided", () => {
    const result = calculateCableSizing({
      designCurrent: 32,
      cableType: "twin-earth",
      ca: 1.0,
      cg: 1.0,
      ci: 1.0,
      circuitType: "power",
      supplyVoltage: 230,
      length: 30,
    });
    const fourMm = result.options.find(o => o.size === 4);
    expect(fourMm).toBeDefined();
    // VD = 11 × 32 × 30 / 1000 = 10.56V = 4.59%
    expect(fourMm!.voltageDrop).toBeCloseTo(10.56, 1);
    expect(fourMm!.voltageDropPercent).toBeCloseTo(4.59, 1);
    expect(fourMm!.meetsVoltageDrop).toBe(true);
  });

  it("fails voltage drop on long runs", () => {
    const result = calculateCableSizing({
      designCurrent: 32,
      cableType: "twin-earth",
      ca: 1.0,
      cg: 1.0,
      ci: 1.0,
      circuitType: "power",
      supplyVoltage: 230,
      length: 50,
    });
    const twoFiveMm = result.options.find(o => o.size === 2.5);
    // VD = 18 × 32 × 50 / 1000 = 28.8V = 12.52% — fail
    expect(twoFiveMm!.meetsVoltageDrop).toBe(false);
  });

  it("uses lighting limit of 3%", () => {
    const result = calculateCableSizing({
      designCurrent: 6,
      cableType: "twin-earth",
      ca: 1.0,
      cg: 1.0,
      ci: 1.0,
      circuitType: "lighting",
      supplyVoltage: 230,
      length: 25,
    });
    expect(result.maxDropPercent).toBe(3);
    // 1mm² T&E: VD = 44 × 6 × 25 / 1000 = 6.6V = 2.87%
    const oneMm = result.options.find(o => o.size === 1.0);
    expect(oneMm!.voltageDropPercent).toBeCloseTo(2.87, 1);
    expect(oneMm!.meetsVoltageDrop).toBe(true);
  });

  it("handles SWA cable selection", () => {
    const result = calculateCableSizing({
      designCurrent: 100,
      cableType: "swa",
      ca: 1.0,
      cg: 1.0,
      ci: 1.0,
      circuitType: "power",
      supplyVoltage: 230,
    });
    // 25mm² SWA = 110A >= 100A
    expect(result.recommendedSize).toBe(25);
  });

  it("returns null when no cable is large enough", () => {
    const result = calculateCableSizing({
      designCurrent: 500,
      cableType: "flex",
      ca: 1.0,
      cg: 1.0,
      ci: 1.0,
      circuitType: "power",
      supplyVoltage: 230,
    });
    expect(result.recommendedSize).toBe(null);
  });
});

describe("cableSizingInputSchema", () => {
  it("rejects invalid cable type", () => {
    const result = cableSizingInputSchema.safeParse({
      designCurrent: 32,
      cableType: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid minimal input", () => {
    const result = cableSizingInputSchema.safeParse({
      designCurrent: 32,
      cableType: "twin-earth",
    });
    expect(result.success).toBe(true);
  });
});
