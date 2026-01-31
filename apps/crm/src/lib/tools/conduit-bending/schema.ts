import { z } from "zod";

export const bendTypeSchema = z.enum(["offset", "saddle", "ninety"]);
export type BendType = z.infer<typeof bendTypeSchema>;

export const conduitBendingInputSchema = z.object({
  /** Type of bend */
  bendType: bendTypeSchema,
  /** Offset height / obstruction depth in mm (for offset and saddle bends) */
  offsetHeight: z.number().positive().max(1000).optional(),
  /** Bend angle in degrees (for offset bend, default 30°; for saddle, center bend angle default 45°) */
  bendAngle: z.number().positive().max(90).optional(),
  /** Conduit diameter in mm (for reference in diagrams) */
  conduitDiameter: z.number().positive().max(100).default(20),
});

export type ConduitBendingInput = z.infer<typeof conduitBendingInputSchema>;

export interface ConduitBendingOutput {
  /** Type of bend */
  bendType: BendType;
  /** Description of the bend */
  description: string;
  /** Distance between bend marks in mm */
  markSpacing: number | null;
  /** Shrinkage (take-up) in mm — how much shorter the conduit run becomes */
  shrinkage: number | null;
  /** Bend angle used */
  angleUsed: number;
  /** Step-by-step instructions */
  steps: string[];
  /** Gain for 90° bends */
  gain: number | null;
}
