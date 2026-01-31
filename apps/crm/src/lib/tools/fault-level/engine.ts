import type { FaultLevelInput, FaultLevelOutput } from "./schema";

/**
 * Short-circuit / fault level estimator.
 *
 * ESTIMATOR MODE — This provides a basic estimation using the Zs method.
 * For formal fault level studies, use IEC 60909 short-circuit calculation methods.
 *
 * Basic prospective fault current (PFC):
 *   Ipf = Uo / Zs
 *   where Uo = nominal voltage to earth (230V for UK single-phase, 400V/√3 for 3-phase)
 *         Zs = earth fault loop impedance (R1 + R2 + Ze)
 *
 * Line-to-neutral fault:
 *   Ipf_ln = Uo / Zpn
 *   where Zpn ≈ 0.8 × Zs (approximation when actual Zpn not measured)
 *
 * Transformer secondary fault level:
 *   I_sc = (kVA × 1000) / (√3 × V × Z%)
 *   where Z% = transformer impedance percentage / 100
 *
 * Reference: BS 7671:2018 Regulation 434, IEC 60909 (guidance only)
 *
 * DISCLAIMER: This is an estimation tool. Formal fault level assessments
 * should be conducted by a qualified engineer using IEC 60909 methodology.
 */

const SQRT3 = Math.sqrt(3);

export function calculateFaultLevel(input: FaultLevelInput): FaultLevelOutput {
  const { voltage, zs, zpn, transformerImpedancePercent, transformerKva } = input;

  // Voltage to earth: for single-phase (230V) use as-is, for 3-phase (400V) use phase voltage
  const uo = voltage <= 253 ? voltage : voltage / SQRT3;

  // Earth fault current
  const pfc_earth = Math.round((uo / zs) * 10) / 10;

  // Line-to-neutral fault current
  const actualZpn = zpn ?? zs * 0.8;
  const pfc_neutral = Math.round((uo / actualZpn) * 10) / 10;

  // Transformer fault level (if data provided)
  let pfc_transformer: number | null = null;
  let faultLevelMva: number | null = null;

  if (transformerKva && transformerImpedancePercent && transformerImpedancePercent > 0) {
    const zPercent = transformerImpedancePercent / 100;
    pfc_transformer = Math.round((transformerKva * 1000) / (SQRT3 * voltage * zPercent) * 10) / 10;
    faultLevelMva = Math.round((pfc_transformer * SQRT3 * voltage / 1_000_000) * 100) / 100;
  }

  // Warning check — typical domestic switchgear rated at 6kA or 10kA
  let warning: string | null = null;
  const maxPfc = Math.max(pfc_earth, pfc_neutral, pfc_transformer ?? 0);
  if (maxPfc > 10000) {
    warning = "Prospective fault current exceeds 10kA. Verify switchgear fault rating.";
  } else if (maxPfc > 6000) {
    warning = "Prospective fault current exceeds 6kA. Standard domestic switchgear may be insufficient.";
  }

  return { pfc_earth, pfc_neutral, pfc_transformer, faultLevelMva, warning };
}
