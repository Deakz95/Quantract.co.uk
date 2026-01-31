import { z } from "zod";

export const faultLevelInputSchema = z.object({
  /** Supply voltage (line-to-line) */
  voltage: z.number().positive().max(11000).default(230),
  /** Earth fault loop impedance Zs in ohms (from test or calculation) */
  zs: z.number().positive().max(100),
  /** Phase-to-neutral impedance Zs for line fault (optional, defaults to Zs × 0.8) */
  zpn: z.number().positive().max(100).optional(),
  /** Transformer impedance percentage (if known) */
  transformerImpedancePercent: z.number().min(0).max(20).optional(),
  /** Transformer kVA rating (if known) */
  transformerKva: z.number().positive().max(10000).optional(),
});

export type FaultLevelInput = z.infer<typeof faultLevelInputSchema>;

export interface FaultLevelOutput {
  /** Prospective fault current — line to earth (A) */
  pfc_earth: number;
  /** Prospective fault current — line to neutral (A) */
  pfc_neutral: number;
  /** Prospective fault current at transformer secondary (A) — if transformer data provided */
  pfc_transformer: number | null;
  /** Fault level in MVA (at supply point) */
  faultLevelMva: number | null;
  /** Warning if values exceed typical switchgear ratings */
  warning: string | null;
}
