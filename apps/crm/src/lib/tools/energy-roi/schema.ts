import { z } from "zod";

export const energyRoiInputSchema = z.object({
  /** Number of fittings to replace */
  fittingCount: z.number().int().positive().max(10000),
  /** Existing fitting wattage */
  existingWatts: z.number().positive().max(2000),
  /** Replacement (LED) fitting wattage */
  replacementWatts: z.number().positive().max(500),
  /** Average daily operating hours */
  dailyHours: z.number().positive().max(24),
  /** Operating days per year */
  daysPerYear: z.number().int().positive().max(366).default(365),
  /** Electricity cost per kWh in pence (UK default ~34p) */
  costPerKwh: z.number().positive().max(200).default(34),
  /** Cost per replacement fitting (material + labour) in pounds */
  costPerFitting: z.number().min(0).max(10000).default(25),
});

export type EnergyRoiInput = z.infer<typeof energyRoiInputSchema>;

export interface EnergyRoiOutput {
  /** Annual energy: existing system (kWh) */
  existingAnnualKwh: number;
  /** Annual energy: replacement system (kWh) */
  replacementAnnualKwh: number;
  /** Annual energy saving (kWh) */
  annualSavingKwh: number;
  /** Annual cost saving (£) */
  annualSavingPounds: number;
  /** Total project cost (£) */
  totalProjectCost: number;
  /** Payback period in months */
  paybackMonths: number;
  /** Annual CO2 saving in kg (using UK grid factor) */
  annualCo2SavingKg: number;
  /** 5-year net savings (£) */
  fiveYearNetSaving: number;
  /** Wattage reduction percentage */
  wattageReduction: number;
}
