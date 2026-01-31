import type { MaxDemandInput, MaxDemandOutput, MaxDemandLoadResult, DiversityProfile, LoadItem } from "./schema";

/**
 * Maximum demand calculation with diversity per IET On-Site Guide Table 1B.
 *
 * Diversity factors represent the probability that all loads operate simultaneously.
 * IET On-Site Guide (companion to BS 7671) Table 1B provides guidance diversity
 * factors for domestic and small commercial installations.
 *
 * Common UK domestic diversity factors (IET guidance):
 *   Lighting: 66% (first 10 points), 50% remainder
 *   Heating/water heater: 100% for largest, then diversity on rest
 *   Cooker: 10A + 30% of remaining (for over 10A)
 *   Socket outlets (ring): 100% for first ring, 40% for additional
 *   Shower: 100% (no diversity for instantaneous loads)
 *   EV charger: 100% (dedicated circuit)
 *
 * This calculator uses simplified flat diversity factors per load type
 * for ease of use. For critical designs, refer to IET On-Site Guide
 * Table 1B directly.
 */

/** Default diversity factors by profile — simplified flat percentages */
const PROFILE_DEFAULTS: Record<DiversityProfile, number> = {
  domestic: 0.6,    // Typical overall domestic diversity
  commercial: 0.7,  // Small commercial
  industrial: 0.8,  // Industrial (higher simultaneity)
  custom: 1.0,      // No diversity — user sets per-item
};

/** Standard supply ratings in amps (UK single-phase) */
const STANDARD_SUPPLY_RATINGS = [60, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800] as const;

export function calculateMaxDemand(input: MaxDemandInput): MaxDemandOutput {
  const { profile, supplyVoltage, loads } = input;
  const defaultDiversity = PROFILE_DEFAULTS[profile];

  const results: MaxDemandLoadResult[] = loads.map((load) => {
    const totalConnected = load.connectedLoad * load.quantity;
    const diversity = load.diversityFactor ?? defaultDiversity;
    const afterDiversity = totalConnected * diversity;

    return {
      description: load.description,
      connectedLoad: load.connectedLoad,
      quantity: load.quantity,
      totalConnected: Math.round(totalConnected),
      diversityFactor: diversity,
      afterDiversity: Math.round(afterDiversity),
    };
  });

  const totalConnected = results.reduce((sum, r) => sum + r.totalConnected, 0);
  const totalAfterDiversity = results.reduce((sum, r) => sum + r.afterDiversity, 0);
  const maxDemandAmps = totalAfterDiversity / supplyVoltage;
  const overallDiversity = totalConnected > 0 ? totalAfterDiversity / totalConnected : 0;

  const suggestedSupply = STANDARD_SUPPLY_RATINGS.find((r) => r >= maxDemandAmps) ?? STANDARD_SUPPLY_RATINGS[STANDARD_SUPPLY_RATINGS.length - 1];

  return {
    loads: results,
    totalConnected,
    totalAfterDiversity,
    maxDemandAmps: Math.round(maxDemandAmps * 10) / 10,
    overallDiversity: Math.round(overallDiversity * 1000) / 1000,
    suggestedSupply,
  };
}
