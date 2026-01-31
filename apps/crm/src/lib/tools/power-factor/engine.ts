import type { PowerFactorInput, PowerFactorOutput } from "./schema";

/**
 * Power factor correction calculator.
 *
 * Required capacitor kVAR = P × (tan(φ1) - tan(φ2))
 *   where P = active power (kW)
 *         φ1 = arccos(current PF)
 *         φ2 = arccos(target PF)
 *
 * kVA = kW / PF
 * kVAR = kW × tan(φ)
 * I = kVA × 1000 / (√3 × V)  [3-phase]
 *
 * Reference: IEC 61921 (power capacitors for power factor correction)
 */

const SQRT3 = Math.sqrt(3);

export function calculatePowerFactor(input: PowerFactorInput): PowerFactorOutput {
  const { activeKw, currentPf, targetPf, voltage } = input;

  const phi1 = Math.acos(currentPf);
  const phi2 = Math.acos(targetPf);

  const currentKvar = activeKw * Math.tan(phi1);
  const correctedKvar = activeKw * Math.tan(phi2);
  const requiredKvar = currentKvar - correctedKvar;

  const currentKva = activeKw / currentPf;
  const correctedKva = activeKw / targetPf;

  const currentAmps = (currentKva * 1000) / (SQRT3 * voltage);
  const correctedAmps = (correctedKva * 1000) / (SQRT3 * voltage);

  const currentReduction = ((currentAmps - correctedAmps) / currentAmps) * 100;
  const kvaReduction = currentKva - correctedKva;

  return {
    requiredKvar: Math.round(requiredKvar * 10) / 10,
    currentKva: Math.round(currentKva * 10) / 10,
    correctedKva: Math.round(correctedKva * 10) / 10,
    currentKvar: Math.round(currentKvar * 10) / 10,
    correctedKvar: Math.round(correctedKvar * 10) / 10,
    currentAmps: Math.round(currentAmps * 10) / 10,
    correctedAmps: Math.round(correctedAmps * 10) / 10,
    currentReduction: Math.round(currentReduction * 10) / 10,
    kvaReduction: Math.round(kvaReduction * 10) / 10,
  };
}
