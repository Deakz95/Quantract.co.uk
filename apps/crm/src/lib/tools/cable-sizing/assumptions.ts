export const cableSizingAssumptions = `
• Current ratings from BS 7671:2018 Appendix 4 for copper conductors with thermoplastic (PVC) insulation at 70°C.
• Reference Method C (clipped direct) for T&E, Method B (in conduit/trunking) for singles, Method E (free air) for SWA.
• Correction factors should be selected per Tables 4B1 (ambient temp), 4C1 (grouping), and Regulation 523.7 (insulation).
• Voltage drop values are for single-phase circuits. For three-phase, select 400V supply and use 3-phase mV/A/m values.
• Cable selection does not account for fault withstand or disconnection time requirements — verify separately.
• Verify specific installation conditions against BS 7671 tables; these are representative values for common scenarios.
`.trim();

export const cableSizingDefaults = {
  designCurrent: 32,
  cableType: "twin-earth" as const,
  ca: 1.0,
  cg: 1.0,
  ci: 1.0,
  circuitType: "power" as const,
  supplyVoltage: 230,
  length: 20,
} as const;
