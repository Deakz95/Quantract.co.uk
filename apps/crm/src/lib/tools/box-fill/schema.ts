import { z } from "zod";

export const boxFillStandardSchema = z.enum(["bs7671", "nec"]);

export const boxFillItemSchema = z.object({
  /** Item type */
  type: z.enum(["conductor", "clamp", "device", "equipment_ground", "fitting"]),
  /** Conductor size in mm² (for conductor type) or AWG equivalent area in mm² */
  conductorSize: z.number().positive().optional(),
  /** Quantity */
  quantity: z.number().int().positive().max(50),
});

export const boxFillInputSchema = z.object({
  standard: boxFillStandardSchema.default("bs7671"),
  /** Box internal volume in cm³ (BS 7671) or cubic inches (NEC) */
  boxVolume: z.number().positive().max(10000),
  /** Items in the box */
  items: z.array(boxFillItemSchema).min(1).max(30),
});

export type BoxFillInput = z.infer<typeof boxFillInputSchema>;
export type BoxFillItem = z.infer<typeof boxFillItemSchema>;

export interface BoxFillOutput {
  totalVolume: number;
  boxVolume: number;
  fillPercent: number;
  compliant: boolean;
  maxFillPercent: number;
  unit: string;
  itemBreakdown: Array<{ type: string; quantity: number; volumeEach: number; volumeTotal: number }>;
}
