import { describe, it, expect } from "vitest";
import { calculateVoltageDrop } from "./engine";
import { voltageDropInputSchema } from "./schema";

describe("calculateVoltageDrop", () => {
  it("calculates basic single-phase voltage drop", () => {
    // 32A, 20m, 4mm² T&E (mV/A/m = 11), 230V
    const result = calculateVoltageDrop({
      current: 32,
      length: 20,
      mvPerAm: 11,
      supplyVoltage: 230,
      maxDropPercent: 5,
    });
    // VD = 11 × 32 × 20 / 1000 = 7.04V
    expect(result.voltageDrop).toBeCloseTo(7.04, 2);
    expect(result.voltageDropPercent).toBeCloseTo(3.06, 1);
    expect(result.compliant).toBe(true);
  });

  it("detects non-compliant voltage drop", () => {
    // 32A, 50m, 2.5mm² T&E (mV/A/m = 18), 230V, 5% limit
    const result = calculateVoltageDrop({
      current: 32,
      length: 50,
      mvPerAm: 18,
      supplyVoltage: 230,
      maxDropPercent: 5,
    });
    // VD = 18 × 32 × 50 / 1000 = 28.8V
    expect(result.voltageDrop).toBeCloseTo(28.8, 1);
    expect(result.voltageDropPercent).toBeCloseTo(12.52, 1);
    expect(result.compliant).toBe(false);
  });

  it("handles lighting circuit 3% limit", () => {
    // 6A, 15m, 1.5mm² T&E (mV/A/m = 29), 230V, 3% limit
    const result = calculateVoltageDrop({
      current: 6,
      length: 15,
      mvPerAm: 29,
      supplyVoltage: 230,
      maxDropPercent: 3,
    });
    // VD = 29 × 6 × 15 / 1000 = 2.61V
    expect(result.voltageDrop).toBeCloseTo(2.61, 2);
    expect(result.voltageDropPercent).toBeCloseTo(1.13, 1);
    expect(result.compliant).toBe(true);
  });

  it("handles three-phase circuit", () => {
    // 63A, 30m, 3-phase mV/A/m = 1.55 (25mm² SWA), 400V
    const result = calculateVoltageDrop({
      current: 63,
      length: 30,
      mvPerAm: 1.55,
      supplyVoltage: 400,
      maxDropPercent: 5,
    });
    // VD = 1.55 × 63 × 30 / 1000 = 2.93V
    expect(result.voltageDrop).toBeCloseTo(2.93, 1);
    expect(result.compliant).toBe(true);
  });

  it("calculates margin correctly", () => {
    const result = calculateVoltageDrop({
      current: 20,
      length: 10,
      mvPerAm: 11,
      supplyVoltage: 230,
      maxDropPercent: 5,
    });
    // VD = 11 × 20 × 10 / 1000 = 2.2V
    // Max = 230 × 0.05 = 11.5V
    // Margin = 11.5 - 2.2 = 9.3V
    expect(result.voltageDrop).toBeCloseTo(2.2, 2);
    expect(result.maxDropVolts).toBeCloseTo(11.5, 1);
    expect(result.marginVolts).toBeCloseTo(9.3, 1);
  });

  it("returns zero margin at exact limit", () => {
    // Choose values so VD exactly = 5% of 230V = 11.5V
    // mV/A/m × I × L / 1000 = 11.5 => use mV=11.5, I=1, L=1000
    const result = calculateVoltageDrop({
      current: 1,
      length: 1000,
      mvPerAm: 11.5,
      supplyVoltage: 230,
      maxDropPercent: 5,
    });
    expect(result.voltageDrop).toBeCloseTo(11.5, 1);
    expect(result.compliant).toBe(true);
    expect(result.marginVolts).toBeCloseTo(0, 1);
  });
});

describe("voltageDropInputSchema", () => {
  it("rejects negative current", () => {
    const result = voltageDropInputSchema.safeParse({
      current: -5,
      length: 10,
      mvPerAm: 11,
      supplyVoltage: 230,
      maxDropPercent: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid supply voltage", () => {
    const result = voltageDropInputSchema.safeParse({
      current: 32,
      length: 10,
      mvPerAm: 11,
      supplyVoltage: 110,
      maxDropPercent: 5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid input", () => {
    const result = voltageDropInputSchema.safeParse({
      current: 32,
      length: 20,
      mvPerAm: 11,
      supplyVoltage: 230,
    });
    expect(result.success).toBe(true);
  });
});
