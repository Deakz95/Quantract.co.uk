import type { AdiabaticInput, AdiabaticOutput, ConductorMaterial } from "./schema";

/**
 * Adiabatic equation for minimum CPC (circuit protective conductor) sizing.
 *
 * BS 7671:2018 Regulation 543.1.3:
 *   S = √(I²t) / k
 *
 * where:
 *   S = minimum cross-sectional area of CPC (mm²)
 *   I = fault current (A) — prospective fault current at point of installation
 *   t = disconnection time (s) — from protective device time/current characteristic
 *   k = factor dependent on conductor material, insulation, and initial/final temperatures
 *
 * k values from BS 7671:2018 Table 54.4:
 *   Copper conductor, 70°C thermoplastic insulation: k = 115
 *   Copper conductor, 90°C thermosetting insulation: k = 143
 *   Aluminium conductor, 70°C thermoplastic insulation: k = 76
 *   Aluminium conductor, 90°C thermosetting insulation: k = 94
 *
 * Default k values used (70°C thermoplastic, most common):
 *   Copper: 115
 *   Aluminium: 76
 */

const DEFAULT_K: Record<ConductorMaterial, number> = {
  copper: 115,
  aluminium: 76,
};

const K_SOURCE: Record<ConductorMaterial, string> = {
  copper: "BS 7671 Table 54.4: Copper, 70°C thermoplastic insulation",
  aluminium: "BS 7671 Table 54.4: Aluminium, 70°C thermoplastic insulation",
};

/** Standard CPC sizes in mm² */
const STANDARD_CPC_SIZES = [1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120] as const;

export function calculateAdiabatic(input: AdiabaticInput): AdiabaticOutput {
  const { faultCurrent, disconnectionTime, material } = input;
  const kFactor = input.kFactor ?? DEFAULT_K[material];

  // I²t = I² × t
  const letThroughEnergy = faultCurrent * faultCurrent * disconnectionTime;

  // S = √(I²t) / k
  const minimumCsa = Math.sqrt(letThroughEnergy) / kFactor;

  // Find next standard size
  const recommendedSize = STANDARD_CPC_SIZES.find((s) => s >= minimumCsa) ?? null;

  const kFactorSource = input.kFactor
    ? `User-specified k = ${kFactor}`
    : K_SOURCE[material];

  return {
    minimumCsa: Math.round(minimumCsa * 100) / 100,
    recommendedSize,
    kFactor,
    letThroughEnergy: Math.round(letThroughEnergy),
    kFactorSource,
  };
}