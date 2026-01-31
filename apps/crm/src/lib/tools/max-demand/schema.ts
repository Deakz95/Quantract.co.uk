import { z } from "zod";

export const loadItemSchema = z.object({
  /** Description of the load */
  description: z.string().min(1).max(200),
  /** Connected load in watts */
  connectedLoad: z.number().positive().max(500000),
  /** Number of points/circuits of this type */
  quantity: z.number().int().positive().max(200),
  /** Diversity factor as decimal (0.0 - 1.0). If omitted, uses profile default. */
  diversityFactor: z.number().min(0).max(1).optional(),
});

export const diversityProfileSchema = z.enum(["domestic", "commercial", "industrial", "custom"]);
export type DiversityProfile = z.infer<typeof diversityProfileSchema>;

export const maxDemandInputSchema = z.object({
  /** Diversity profile to use */
  profile: diversityProfileSchema.default("domestic"),
  /** Supply voltage */
  supplyVoltage: z.number().positive().default(230),
  /** Load items */
  loads: z.array(loadItemSchema).min(1).max(50),
});

export type MaxDemandInput = z.infer<typeof maxDemandInputSchema>;
export type LoadItem = z.infer<typeof loadItemSchema>;

export interface MaxDemandLoadResult {
  description: string;
  connectedLoad: number;
  quantity: number;
  totalConnected: number;
  diversityFactor: number;
  afterDiversity: number;
}

export interface MaxDemandOutput {
  /** Individual load results */
  loads: MaxDemandLoadResult[];
  /** Total connected load in watts */
  totalConnected: number;
  /** Total after diversity in watts */
  totalAfterDiversity: number;
  /** Maximum demand current in amps */
  maxDemandAmps: number;
  /** Diversity ratio (after/connected) */
  overallDiversity: number;
  /** Suggested supply rating in amps (next standard size up) */
  suggestedSupply: number;
}
