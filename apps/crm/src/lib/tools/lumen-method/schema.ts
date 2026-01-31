import { z } from "zod";

export const lumenMethodInputSchema = z.object({
  /** Required lux level on working plane */
  targetLux: z.number().positive().max(5000),
  /** Room length in metres */
  roomLength: z.number().positive().max(500),
  /** Room width in metres */
  roomWidth: z.number().positive().max(500),
  /** Luminaire lumen output (per fitting) */
  luminaireLumens: z.number().positive().max(200000),
  /** Coefficient of utilization (CU) — decimal, typical 0.4-0.8 */
  cu: z.number().min(0.1).max(1.0).default(0.6),
  /** Maintenance factor (MF) / Light loss factor (LLF) — decimal, typical 0.7-0.9 */
  mf: z.number().min(0.1).max(1.0).default(0.8),
  /** Mounting height above working plane in metres (for spacing calc) */
  mountingHeight: z.number().positive().max(50).optional(),
  /** Maximum spacing-to-height ratio (SHR) — typical 1.0-1.5 */
  maxShr: z.number().positive().max(3.0).default(1.5),
});

export type LumenMethodInput = z.infer<typeof lumenMethodInputSchema>;

export interface LumenMethodOutput {
  /** Room area in m² */
  roomArea: number;
  /** Total lumens required */
  totalLumensRequired: number;
  /** Number of luminaires required */
  luminaireCount: number;
  /** Achieved lux level */
  achievedLux: number;
  /** Room index (RI) */
  roomIndex: number | null;
  /** Recommended grid layout (rows × columns) */
  gridRows: number;
  gridCols: number;
  /** Spacing between luminaires (length direction) in metres */
  spacingLength: number;
  /** Spacing between luminaires (width direction) in metres */
  spacingWidth: number;
  /** Whether spacing meets SHR requirement */
  shrCompliant: boolean;
  /** Actual SHR */
  actualShr: number | null;
}
