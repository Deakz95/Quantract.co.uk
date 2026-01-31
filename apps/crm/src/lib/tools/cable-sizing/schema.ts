import { z } from "zod";

export const cableTypeSchema = z.enum(["twin-earth", "singles", "swa", "flex"]);
export type CableType = z.infer<typeof cableTypeSchema>;

export const cableSizingInputSchema = z.object({
  /** Design current in amps */
  designCurrent: z.number().positive().max(1000),
  /** Cable type */
  cableType: cableTypeSchema,
  /** Ambient temperature correction factor Ca */
  ca: z.number().positive().max(2).default(1.0),
  /** Grouping correction factor Cg */
  cg: z.number().positive().max(2).default(1.0),
  /** Thermal insulation correction factor Ci */
  ci: z.number().positive().max(2).default(1.0),
  /** Circuit type for voltage drop limit */
  circuitType: z.enum(["power", "lighting"]).default("power"),
  /** Supply voltage */
  supplyVoltage: z.number().refine(v => v === 230 || v === 400, { message: "Must be 230V or 400V" }).default(230),
  /** Circuit length in metres (optional, for voltage drop check) */
  length: z.number().positive().max(10000).optional(),
});

export type CableSizingInput = z.infer<typeof cableSizingInputSchema>;

export interface CableOption {
  size: number;
  currentRating: number;
  deratedRating: number;
  mvPerAm: number;
  voltageDrop: number | null;
  voltageDropPercent: number | null;
  meetsCurrentRating: boolean;
  meetsVoltageDrop: boolean | null;
  compliant: boolean;
}

export interface CableSizingOutput {
  /** Required minimum current carrying capacity after derating */
  requiredCcc: number;
  /** Combined correction factor */
  correctionFactor: number;
  /** All cable options with compliance status */
  options: CableOption[];
  /** Recommended (smallest compliant) cable size in mm² */
  recommendedSize: number | null;
  /** Max voltage drop percentage allowed */
  maxDropPercent: number;
}
