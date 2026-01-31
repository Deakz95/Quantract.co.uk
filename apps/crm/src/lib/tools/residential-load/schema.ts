import { z } from "zod";

export const residentialLoadInputSchema = z.object({
  /** Number of lighting points */
  lightingPoints: z.number().int().min(0).max(100).default(0),
  /** Lighting wattage per point (typical 100W) */
  lightingWattsPerPoint: z.number().min(0).max(1000).default(100),
  /** Number of standard ring mains */
  ringMains: z.number().int().min(0).max(10).default(0),
  /** Number of radial circuits (individual socket circuits) */
  radialCircuits: z.number().int().min(0).max(20).default(0),
  /** Cooker rated power in watts (0 if none) */
  cookerWatts: z.number().min(0).max(50000).default(0),
  /** Number of electric showers */
  showers: z.number().int().min(0).max(5).default(0),
  /** Shower power in watts (each) */
  showerWattsEach: z.number().min(0).max(15000).default(9000),
  /** Immersion heater watts (0 if none) */
  immersionWatts: z.number().min(0).max(6000).default(0),
  /** Storage heater total watts (0 if none) */
  storageHeaterWatts: z.number().min(0).max(50000).default(0),
  /** EV charger watts (0 if none) */
  evChargerWatts: z.number().min(0).max(22000).default(0),
  /** Other fixed loads in watts */
  otherFixedWatts: z.number().min(0).max(100000).default(0),
  /** Supply voltage */
  supplyVoltage: z.number().positive().default(230),
});

export type ResidentialLoadInput = z.infer<typeof residentialLoadInputSchema>;

export interface ResidentialLoadOutput {
  /** Breakdown of each load category */
  breakdown: Array<{ category: string; connected: number; afterDiversity: number; diversityApplied: string }>;
  /** Total connected load in watts */
  totalConnected: number;
  /** Total after diversity in watts */
  totalAfterDiversity: number;
  /** Maximum demand in amps */
  maxDemandAmps: number;
  /** Suggested service size in amps */
  suggestedServiceSize: number;
  /** Service size options with headroom percentage */
  serviceOptions: Array<{ size: number; headroom: number }>;
}
