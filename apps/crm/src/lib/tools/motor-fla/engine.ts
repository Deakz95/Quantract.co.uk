import type { MotorFlaInput, MotorFlaOutput } from "./schema";

/**
 * Motor full-load current calculator.
 *
 * Single-phase:
 *   FLA = (P × 1000) / (V × PF × η)
 *   where P = output power (kW), V = voltage, PF = power factor, η = efficiency
 *
 * Three-phase:
 *   FLA = (P × 1000) / (√3 × V × PF × η)
 *
 * Starting current estimate: 6 × FLA (DOL start — typical for motors up to ~7.5kW)
 * For star-delta or soft starters, starting current is reduced.
 *
 * Cable and protection suggestions are guidance only — verify per BS 7671.
 *
 * Reference: IEC 60034 (motor ratings), BS 7671:2018 Section 552
 */

const SQRT3 = Math.sqrt(3);

/** Standard protection ratings (MCB/fuse) in amps */
const PROTECTION_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630] as const;

/** Standard cable sizes in mm² */
const CABLE_SIZES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300] as const;

/** Approximate current rating for SWA cable sizes (3-phase, clipped) */
const CABLE_RATINGS: Record<number, number> = {
  1.5: 18, 2.5: 25, 4: 34, 6: 43, 10: 60, 16: 80, 25: 105,
  35: 130, 50: 160, 70: 200, 95: 245, 120: 285, 150: 325,
  185: 370, 240: 435, 300: 500,
};

export function calculateMotorFla(input: MotorFlaInput): MotorFlaOutput {
  const { powerKw, phase, voltage, powerFactor, efficiency } = input;

  const inputPowerKw = powerKw / efficiency;
  const inputPowerW = inputPowerKw * 1000;

  let fla: number;
  if (phase === "single") {
    fla = inputPowerW / (voltage * powerFactor);
  } else {
    fla = inputPowerW / (SQRT3 * voltage * powerFactor);
  }

  const apparentPowerKva = inputPowerKw / powerFactor;
  const startingCurrent = fla * 6; // DOL start estimate

  // Suggest cable: find smallest cable rated above FLA
  const suggestedCable = CABLE_SIZES.find((s) => (CABLE_RATINGS[s] ?? 0) >= fla) ?? null;

  // Suggest protection: next size up from FLA (motor circuits use Type D MCB or fuse)
  const suggestedProtection = PROTECTION_RATINGS.find((r) => r >= fla) ?? null;

  return {
    fla: Math.round(fla * 10) / 10,
    startingCurrent: Math.round(startingCurrent * 10) / 10,
    suggestedCable,
    suggestedProtection,
    inputPowerKw: Math.round(inputPowerKw * 100) / 100,
    apparentPowerKva: Math.round(apparentPowerKva * 100) / 100,
  };
}
