import { describe, it, expect } from "vitest";
import { calculateEnergyRoi } from "./engine";

describe("calculateEnergyRoi", () => {
  it("calculates annual kWh savings", () => {
    const result = calculateEnergyRoi({
      fittingCount: 10,
      existingWatts: 50,
      replacementWatts: 8,
      dailyHours: 10,
      daysPerYear: 365,
      costPerKwh: 34,
      costPerFitting: 25,
    });
    // Existing: 10 × 50W × 3650h / 1000 = 1825 kWh
    // Replacement: 10 × 8W × 3650h / 1000 = 292 kWh
    // Saving: 1533 kWh
    expect(result.existingAnnualKwh).toBe(1825);
    expect(result.replacementAnnualKwh).toBe(292);
    expect(result.annualSavingKwh).toBe(1533);
  });

  it("calculates cost savings in pounds", () => {
    const result = calculateEnergyRoi({
      fittingCount: 10,
      existingWatts: 50,
      replacementWatts: 8,
      dailyHours: 10,
      daysPerYear: 365,
      costPerKwh: 34,
      costPerFitting: 25,
    });
    // 1533 kWh × 34p / 100 = £521.22
    expect(result.annualSavingPounds).toBeCloseTo(521.22, 0);
  });

  it("calculates payback period", () => {
    const result = calculateEnergyRoi({
      fittingCount: 10,
      existingWatts: 50,
      replacementWatts: 8,
      dailyHours: 10,
      daysPerYear: 365,
      costPerKwh: 34,
      costPerFitting: 25,
    });
    // Total cost = 10 × £25 = £250
    // Payback = (250/521.22) × 12 = 5.75 months
    expect(result.totalProjectCost).toBe(250);
    expect(result.paybackMonths).toBeCloseTo(5.8, 0);
  });

  it("calculates CO2 savings", () => {
    const result = calculateEnergyRoi({
      fittingCount: 10,
      existingWatts: 50,
      replacementWatts: 8,
      dailyHours: 10,
      daysPerYear: 365,
      costPerKwh: 34,
      costPerFitting: 25,
    });
    // 1533 × 0.207 = 317 kg
    expect(result.annualCo2SavingKg).toBeCloseTo(317, -1);
  });

  it("calculates wattage reduction percentage", () => {
    const result = calculateEnergyRoi({
      fittingCount: 1,
      existingWatts: 100,
      replacementWatts: 10,
      dailyHours: 1,
      daysPerYear: 1,
      costPerKwh: 34,
      costPerFitting: 0,
    });
    expect(result.wattageReduction).toBe(90);
  });

  it("calculates 5-year net saving", () => {
    const result = calculateEnergyRoi({
      fittingCount: 10,
      existingWatts: 50,
      replacementWatts: 8,
      dailyHours: 10,
      daysPerYear: 365,
      costPerKwh: 34,
      costPerFitting: 25,
    });
    // 5yr saving = 521.22 × 5 - 250 = 2356.10
    expect(result.fiveYearNetSaving).toBeCloseTo(2356, -1);
  });
});
