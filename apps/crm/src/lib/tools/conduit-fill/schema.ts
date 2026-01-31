import { z } from "zod";

export const standardSchema = z.enum(["bs7671", "nec"]);
export type Standard = z.infer<typeof standardSchema>;

export const conduitCableSchema = z.object({
  /** Cable overall diameter in mm */
  diameter: z.number().positive().max(100),
  /** Number of cables of this size */
  quantity: z.number().int().positive().max(100),
});

export const conduitFillInputSchema = z.object({
  /** Standard to check against */
  standard: standardSchema.default("bs7671"),
  /** Conduit internal diameter in mm */
  conduitDiameter: z.number().positive().max(200),
  /** Cables to fit */
  cables: z.array(conduitCableSchema).min(1).max(20),
});

export type ConduitFillInput = z.infer<typeof conduitFillInputSchema>;
export type ConduitCable = z.infer<typeof conduitCableSchema>;

export interface ConduitFillOutput {
  /** Total cross-sectional area of all cables in mm² */
  totalCableArea: number;
  /** Internal cross-sectional area of conduit in mm² */
  conduitArea: number;
  /** Fill percentage */
  fillPercent: number;
  /** Maximum allowed fill percentage for the standard */
  maxFillPercent: number;
  /** Whether the fill is compliant */
  compliant: boolean;
  /** Number of total cables */
  totalCables: number;
  /** Space factor description */
  spaceFactor: string;
}
