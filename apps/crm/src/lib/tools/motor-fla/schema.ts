import { z } from "zod";

export const motorPhaseSchema = z.enum(["single", "three"]);
export type MotorPhase = z.infer<typeof motorPhaseSchema>;

export const motorFlaInputSchema = z.object({
  /** Motor power in kW */
  powerKw: z.number().positive().max(5000),
  /** Phase configuration */
  phase: motorPhaseSchema,
  /** Supply voltage */
  voltage: z.number().positive().max(11000).default(400),
  /** Power factor (typical 0.8 - 0.95) */
  powerFactor: z.number().min(0.5).max(1.0).default(0.85),
  /** Motor efficiency (typical 0.85 - 0.96) */
  efficiency: z.number().min(0.5).max(1.0).default(0.90),
});

export type MotorFlaInput = z.infer<typeof motorFlaInputSchema>;

export interface MotorFlaOutput {
  /** Full-load current in amps */
  fla: number;
  /** Starting current estimate (typically 6-8× FLA for DOL) */
  startingCurrent: number;
  /** Suggested cable size in mm² */
  suggestedCable: number | null;
  /** Suggested fuse/MCB rating in amps */
  suggestedProtection: number | null;
  /** Motor input power in kW (accounting for efficiency) */
  inputPowerKw: number;
  /** Apparent power in kVA */
  apparentPowerKva: number;
}
