import { z } from "zod";

export const powerFactorInputSchema = z.object({
  /** Active power in kW */
  activeKw: z.number().positive().max(50000),
  /** Current (existing) power factor */
  currentPf: z.number().min(0.3).max(0.99),
  /** Target power factor */
  targetPf: z.number().min(0.8).max(1.0).default(0.95),
  /** Supply voltage (line-to-line for 3-phase) */
  voltage: z.number().positive().max(11000).default(400),
});

export type PowerFactorInput = z.infer<typeof powerFactorInputSchema>;

export interface PowerFactorOutput {
  /** kVAR of capacitor bank required */
  requiredKvar: number;
  /** Current apparent power (kVA) */
  currentKva: number;
  /** Corrected apparent power (kVA) */
  correctedKva: number;
  /** Current reactive power (kVAR) */
  currentKvar: number;
  /** Corrected reactive power (kVAR) */
  correctedKvar: number;
  /** Current line current (A) */
  currentAmps: number;
  /** Corrected line current (A) */
  correctedAmps: number;
  /** Current reduction percentage */
  currentReduction: number;
  /** kVA reduction */
  kvaReduction: number;
}
