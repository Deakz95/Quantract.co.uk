import type { EnergyRoiInput, EnergyRoiOutput } from "./schema";

/**
 * Energy cost and ROI estimator for LED upgrades.
 *
 * Calculates annual energy savings, payback period, and CO2 reduction
 * from replacing conventional fittings with LED alternatives.
 *
 * UK grid carbon intensity factor: 0.207 kg CO2/kWh (2023 DEFRA conversion)
 * This decreases yearly as the grid decarbonises.
 *
 * Default electricity rate: 34p/kWh (UK Ofgem cap rate, subject to change).
 */

/** UK grid carbon intensity factor: kg CO2 per kWh (DEFRA 2023) */
const CO2_PER_KWH = 0.207;

export function calculateEnergyRoi(input: EnergyRoiInput): EnergyRoiOutput {
  const {
    fittingCount, existingWatts, replacementWatts,
    dailyHours, daysPerYear, costPerKwh, costPerFitting,
  } = input;

  const annualHours = dailyHours * daysPerYear;

  const existingAnnualKwh = (fittingCount * existingWatts * annualHours) / 1000;
  const replacementAnnualKwh = (fittingCount * replacementWatts * annualHours) / 1000;
  const annualSavingKwh = existingAnnualKwh - replacementAnnualKwh;

  const annualSavingPounds = (annualSavingKwh * costPerKwh) / 100; // pence to pounds
  const totalProjectCost = fittingCount * costPerFitting;

  const paybackMonths = annualSavingPounds > 0
    ? Math.round((totalProjectCost / annualSavingPounds) * 12 * 10) / 10
    : 0;

  const annualCo2SavingKg = Math.round(annualSavingKwh * CO2_PER_KWH);
  const fiveYearNetSaving = Math.round((annualSavingPounds * 5 - totalProjectCost) * 100) / 100;
  const wattageReduction = Math.round(((existingWatts - replacementWatts) / existingWatts) * 100);

  return {
    existingAnnualKwh: Math.round(existingAnnualKwh),
    replacementAnnualKwh: Math.round(replacementAnnualKwh),
    annualSavingKwh: Math.round(annualSavingKwh),
    annualSavingPounds: Math.round(annualSavingPounds * 100) / 100,
    totalProjectCost: Math.round(totalProjectCost * 100) / 100,
    paybackMonths,
    annualCo2SavingKg,
    fiveYearNetSaving,
    wattageReduction,
  };
}
