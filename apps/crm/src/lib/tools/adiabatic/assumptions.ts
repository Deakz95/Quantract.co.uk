export const adiabaticAssumptions = `
• Uses the adiabatic equation S = √(I²t) / k per BS 7671:2018 Regulation 543.1.3.
• Default k values are for 70°C thermoplastic (PVC) insulation per Table 54.4.
• For 90°C thermosetting (XLPE/LSF) insulation, use k = 143 (copper) or k = 94 (aluminium).
• The fault current (I) should be the prospective fault current at the furthest point of the circuit.
• Disconnection time (t) is read from the protective device time/current characteristic for the fault current value.
• This calculation assumes adiabatic conditions (no heat dissipation during fault) — valid for disconnection times up to 5 seconds.
• The result is the minimum CPC size; the actual CPC may need to be larger for other reasons (e.g., earth fault loop impedance).
`.trim();

export const adiabaticDefaults = {
  faultCurrent: 1200,
  disconnectionTime: 0.4,
  material: "copper" as const,
} as const;