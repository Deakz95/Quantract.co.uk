import { z } from "zod";

export const highBayInputSchema = z.object({
  /** Area length in metres */
  areaLength: z.number().positive().max(500),
  /** Area width in metres */
  areaWidth: z.number().positive().max(500),
  /** Mounting height in metres */
  mountingHeight: z.number().positive().max(50),
  /** Required lux level */
  targetLux: z.number().positive().max(2000).default(300),
  /** Luminaire lumen output */
  luminaireLumens: z.number().positive().max(200000).default(30000),
  /** Target spacing-to-height ratio (default 1.0 for high-bay) */
  targetShr: z.number().positive().max(2.0).default(1.0),
  /** CU — typically lower for high-bay (0.4-0.6) */
  cu: z.number().min(0.1).max(1.0).default(0.5),
  /** MF — maintenance factor */
  mf: z.number().min(0.1).max(1.0).default(0.7),
});

export type HighBayInput = z.infer<typeof highBayInputSchema>;

export interface HighBayOutput {
  area: number;
  luminaireCount: number;
  gridRows: number;
  gridCols: number;
  spacingLength: number;
  spacingWidth: number;
  actualShr: number;
  shrCompliant: boolean;
  achievedLux: number;
  wattsPerSqm: number | null;
  recommendations: string[];
}
