export const residentialLoadAssumptions = `
• Diversity rules are simplified from IET On-Site Guide Table 1B.
• Ring main rated at 32A (7,360W at 230V). First ring at 100%, additional rings at 40%.
• Radial circuit rated at 20A (4,600W at 230V). First at 100%, additional at 40%.
• Cooker diversity: 10A + 30% of the remaining current above 10A.
• Instantaneous loads (showers, immersion) assessed at 100% — no diversity.
• EV chargers and storage heaters at 100% (dedicated circuits).
• Standard UK domestic supply sizes: 60A, 80A, 100A single-phase.
• For larger properties or 3-phase supplies, a formal maximum demand assessment is recommended.`.trim();

export const residentialLoadDefaults = {
  lightingPoints: 15,
  lightingWattsPerPoint: 100,
  ringMains: 2,
  radialCircuits: 0,
  cookerWatts: 10000,
  showers: 1,
  showerWattsEach: 9000,
  immersionWatts: 3000,
  storageHeaterWatts: 0,
  evChargerWatts: 0,
  otherFixedWatts: 0,
  supplyVoltage: 230,
} as const;
