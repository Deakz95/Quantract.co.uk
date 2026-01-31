import { z } from "zod";

export const conductorMaterialSchema = z.enum(["copper", "aluminium"]);
export type ConductorMaterial = z.infer<typeof conductorMaterialSchema>;

export const adiabaticInputSchema = z.object({
  /** Prospective fault current in amps (If) */
  faultCurrent: z.number().positive().max(100000),
  /** Disconnection time in seconds (t) — from protective device characteristic */
  disconnectionTime: z.number().positive().max(5),
  /** Conductor material */
  material: conductorMaterialSchema.default("copper"),
  /** k factor — material constant from BS 7671 Table 54.4 */
  kFactor: z.number().positive().optional(),
});

export type AdiabaticInput = z.infer<typeof adiabaticInputSchema>;

export interface AdiabaticOutput {
  /** Minimum CPC cross-section in mm² */
  minimumCsa: number;
  /** Next standard cable size up in mm² */
  recommendedSize: number | null;
  /** k factor used */
  kFactor: number;
  /** I²t (let-through energy) */
  letThroughEnergy: number;
  /** Description of the k factor source */
  kFactorSource: string;
}
