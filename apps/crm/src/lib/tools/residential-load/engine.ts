import type { ResidentialLoadInput, ResidentialLoadOutput } from "./schema";

/**
 * Residential load calculator following IET On-Site Guide diversity guidance.
 *
 * Applies simplified diversity rules based on IET On-Site Guide Table 1B:
 *
 * Lighting: 66% of total lighting load
 * Socket outlets (ring main): First ring at 100% = ~7.36kW, additional at 40%
 * Socket outlets (radial 20A): ~4.6kW each at 40% (first at 100%)
 * Cooker: 10A + 30% of remainder + 5A if socket outlet in cooker unit
 * Electric shower: 100% (instantaneous, no diversity)
 * Immersion heater: 100% (thermostatically controlled but full rating for demand)
 * Storage heaters: 100% (overnight tariff, all on at same time typically)
 * EV charger: 100% (dedicated circuit)
 * Other fixed loads: 100% (conservative)
 *
 * Standard UK domestic service sizes: 60A, 80A, 100A
 * (200A typically for larger properties with 3-phase)
 */

const STANDARD_SERVICE_SIZES = [60, 80, 100, 125, 160, 200] as const;

export function calculateResidentialLoad(input: ResidentialLoadInput): ResidentialLoadOutput {
  const breakdown: ResidentialLoadOutput["breakdown"] = [];

  // Lighting
  const lightingConnected = input.lightingPoints * input.lightingWattsPerPoint;
  const lightingDiversified = Math.round(lightingConnected * 0.66);
  if (lightingConnected > 0) {
    breakdown.push({ category: "Lighting", connected: lightingConnected, afterDiversity: lightingDiversified, diversityApplied: "66%" });
  }

  // Ring mains (each rated at 32A = 7360W at 230V)
  const ringConnected = input.ringMains * 7360;
  let ringDiversified = 0;
  if (input.ringMains > 0) {
    ringDiversified = 7360; // First ring at 100%
    if (input.ringMains > 1) {
      ringDiversified += (input.ringMains - 1) * 7360 * 0.4;
    }
    ringDiversified = Math.round(ringDiversified);
    breakdown.push({ category: "Ring mains", connected: ringConnected, afterDiversity: ringDiversified, diversityApplied: "100% first, 40% rest" });
  }

  // Radial circuits (each at 20A = 4600W at 230V)
  const radialConnected = input.radialCircuits * 4600;
  let radialDiversified = 0;
  if (input.radialCircuits > 0) {
    radialDiversified = 4600; // First at 100%
    if (input.radialCircuits > 1) {
      radialDiversified += (input.radialCircuits - 1) * 4600 * 0.4;
    }
    radialDiversified = Math.round(radialDiversified);
    breakdown.push({ category: "Radial circuits", connected: radialConnected, afterDiversity: radialDiversified, diversityApplied: "100% first, 40% rest" });
  }

  // Cooker
  const cookerConnected = input.cookerWatts;
  let cookerDiversified = 0;
  if (cookerConnected > 0) {
    const cookerAmps = cookerConnected / input.supplyVoltage;
    if (cookerAmps > 10) {
      // 10A + 30% of remainder
      cookerDiversified = Math.round((10 + (cookerAmps - 10) * 0.3) * input.supplyVoltage);
    } else {
      cookerDiversified = cookerConnected;
    }
    breakdown.push({ category: "Cooker", connected: cookerConnected, afterDiversity: cookerDiversified, diversityApplied: "10A + 30% of remainder" });
  }

  // Showers (100% — no diversity for instantaneous)
  const showerConnected = input.showers * input.showerWattsEach;
  if (showerConnected > 0) {
    breakdown.push({ category: "Electric shower(s)", connected: showerConnected, afterDiversity: showerConnected, diversityApplied: "100% (instantaneous)" });
  }

  // Immersion heater
  if (input.immersionWatts > 0) {
    breakdown.push({ category: "Immersion heater", connected: input.immersionWatts, afterDiversity: input.immersionWatts, diversityApplied: "100%" });
  }

  // Storage heaters
  if (input.storageHeaterWatts > 0) {
    breakdown.push({ category: "Storage heaters", connected: input.storageHeaterWatts, afterDiversity: input.storageHeaterWatts, diversityApplied: "100%" });
  }

  // EV charger
  if (input.evChargerWatts > 0) {
    breakdown.push({ category: "EV charger", connected: input.evChargerWatts, afterDiversity: input.evChargerWatts, diversityApplied: "100% (dedicated)" });
  }

  // Other fixed loads
  if (input.otherFixedWatts > 0) {
    breakdown.push({ category: "Other fixed loads", connected: input.otherFixedWatts, afterDiversity: input.otherFixedWatts, diversityApplied: "100% (conservative)" });
  }

  const totalConnected = breakdown.reduce((s, b) => s + b.connected, 0);
  const totalAfterDiversity = breakdown.reduce((s, b) => s + b.afterDiversity, 0);
  const maxDemandAmps = Math.round((totalAfterDiversity / input.supplyVoltage) * 10) / 10;

  const suggestedServiceSize = STANDARD_SERVICE_SIZES.find((s) => s >= maxDemandAmps) ?? 200;

  const serviceOptions = STANDARD_SERVICE_SIZES
    .filter((s) => s >= maxDemandAmps * 0.8)
    .map((size) => ({
      size,
      headroom: Math.round(((size - maxDemandAmps) / size) * 100),
    }));

  return {
    breakdown,
    totalConnected,
    totalAfterDiversity,
    maxDemandAmps,
    suggestedServiceSize,
    serviceOptions,
  };
}
