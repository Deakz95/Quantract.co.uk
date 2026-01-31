import type { TransformerSizingInput, TransformerSizingOutput } from "./schema";

/**
 * Transformer sizing calculator.
 *
 * kVA = kW / power_factor
 * Primary current = kVA × 1000 / (√3 × V_primary)  [3-phase]
 * Secondary current = kVA × 1000 / (√3 × V_secondary)  [3-phase]
 *
 * Standard transformer sizes (kVA): 25, 50, 100, 160, 200, 250, 315, 400, 500,
 * 630, 800, 1000, 1250, 1600, 2000, 2500
 *
 * Reference: IEC 60076 (power transformers)
 */

const SQRT3 = Math.sqrt(3);

const STANDARD_SIZES = [25, 50, 100, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500] as const;

const PROTECTION_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250] as const;

export function calculateTransformerSizing(input: TransformerSizingInput): TransformerSizingOutput {
  const { loadKw, powerFactor, primaryVoltage, secondaryVoltage, growthAllowance } = input;

  const requiredKva = loadKw / powerFactor;
  const requiredKvaWithGrowth = requiredKva * (1 + growthAllowance);

  const recommendedKva = STANDARD_SIZES.find((s) => s >= requiredKvaWithGrowth) ?? STANDARD_SIZES[STANDARD_SIZES.length - 1];

  const primaryCurrent = (recommendedKva * 1000) / (SQRT3 * primaryVoltage);
  const secondaryCurrent = (recommendedKva * 1000) / (SQRT3 * secondaryVoltage);

  const loadingPercent = (requiredKva / recommendedKva) * 100;

  const suggestedPrimaryProtection = PROTECTION_RATINGS.find((r) => r >= primaryCurrent) ?? null;
  const suggestedSecondaryProtection = PROTECTION_RATINGS.find((r) => r >= secondaryCurrent) ?? null;

  return {
    requiredKva: Math.round(requiredKva * 10) / 10,
    requiredKvaWithGrowth: Math.round(requiredKvaWithGrowth * 10) / 10,
    recommendedKva,
    primaryCurrent: Math.round(primaryCurrent * 10) / 10,
    secondaryCurrent: Math.round(secondaryCurrent * 10) / 10,
    loadingPercent: Math.round(loadingPercent * 10) / 10,
    suggestedPrimaryProtection,
    suggestedSecondaryProtection,
  };
}
