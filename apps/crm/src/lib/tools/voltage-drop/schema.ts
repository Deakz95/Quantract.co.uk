import { z } from "zod";

export const voltageDropInputSchema = z.object({
  /** Design current in amps */
  current: z.number().positive().max(1000),
  /** Circuit length in metres (one way) */
  length: z.number().positive().max(10000),
  /** Cable mV/A/m value from BS 7671 Appendix 4 tables */
  mvPerAm: z.number().positive(),
  /** Supply voltage (230V single-phase or 400V three-phase) */
  supplyVoltage: z.number().refine(v => v === 230 || v === 400, { message: "Supply voltage must be 230V (1φ) or 400V (3φ)" }),
  /** Maximum permitted voltage drop as percentage (BS 7671 limits: 3% lighting, 5% power) */
  maxDropPercent: z.number().positive().max(10).default(5),
});

export type VoltageDropInput = z.infer<typeof voltageDropInputSchema>;

export interface VoltageDropOutput {
  /** Voltage drop in volts */
  voltageDrop: number;
  /** Voltage drop as percentage of supply */
  voltageDropPercent: number;
  /** Whether the circuit meets the max drop limit */
  compliant: boolean;
  /** Remaining margin in volts */
  marginVolts: number;
  /** Maximum permitted drop in volts */
  maxDropVolts: number;
}
