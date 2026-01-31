import { z } from "zod";

export const transformerSizingInputSchema = z.object({
  /** Total load in kW */
  loadKw: z.number().positive().max(50000),
  /** Load power factor */
  powerFactor: z.number().min(0.5).max(1.0).default(0.85),
  /** Primary voltage */
  primaryVoltage: z.number().positive().max(132000).default(11000),
  /** Secondary voltage */
  secondaryVoltage: z.number().positive().max(11000).default(400),
  /** Future growth allowance as decimal (e.g., 0.2 = 20%) */
  growthAllowance: z.number().min(0).max(1.0).default(0.2),
});

export type TransformerSizingInput = z.infer<typeof transformerSizingInputSchema>;

export interface TransformerSizingOutput {
  /** Required kVA (before growth) */
  requiredKva: number;
  /** Required kVA (with growth) */
  requiredKvaWithGrowth: number;
  /** Recommended standard transformer size in kVA */
  recommendedKva: number;
  /** Primary full-load current in amps */
  primaryCurrent: number;
  /** Secondary full-load current in amps */
  secondaryCurrent: number;
  /** Loading percentage at recommended size */
  loadingPercent: number;
  /** Suggested primary fuse rating */
  suggestedPrimaryProtection: number | null;
  /** Suggested secondary protection rating */
  suggestedSecondaryProtection: number | null;
}
