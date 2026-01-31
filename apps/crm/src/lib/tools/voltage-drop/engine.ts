import type { VoltageDropInput, VoltageDropOutput } from "./schema";

/**
 * Calculate voltage drop per BS 7671:2018 Appendix 4.
 *
 * Formula: VD = (mV/A/m × Ib × L) / 1000
 *   where mV/A/m = millivolt drop per amp per metre (from Appendix 4 tables)
 *         Ib = design current (A)
 *         L = route length one-way (m)
 *
 * For three-phase circuits (400V supply), the mV/A/m values from BS 7671
 * tables already account for three-phase geometry, so no √3 factor needed
 * when using tabulated 3-phase mV/A/m values.
 *
 * BS 7671:2018 limits (Regulation 525.1):
 *   - 3% for lighting circuits
 *   - 5% for other circuits
 * These are measured from the origin of the installation.
 *
 * Reference: BS 7671:2018+A2:2022, Appendix 4, Section 6.4
 */
export function calculateVoltageDrop(input: VoltageDropInput): VoltageDropOutput {
  const { current, length, mvPerAm, supplyVoltage, maxDropPercent } = input;

  // VD = (mV/A/m × I × L) / 1000
  const voltageDrop = (mvPerAm * current * length) / 1000;
  const voltageDropPercent = (voltageDrop / supplyVoltage) * 100;
  const maxDropVolts = (maxDropPercent / 100) * supplyVoltage;
  const compliant = voltageDropPercent <= maxDropPercent;
  const marginVolts = maxDropVolts - voltageDrop;

  return {
    voltageDrop: Math.round(voltageDrop * 100) / 100,
    voltageDropPercent: Math.round(voltageDropPercent * 100) / 100,
    compliant,
    marginVolts: Math.round(marginVolts * 100) / 100,
    maxDropVolts: Math.round(maxDropVolts * 100) / 100,
  };
}
