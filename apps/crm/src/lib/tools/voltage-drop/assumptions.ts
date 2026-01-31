export const voltageDropAssumptions = `
• Uses mV/A/m values from BS 7671:2018 Appendix 4 tables.
• Voltage drop is calculated for the one-way cable route length.
• Default limits: 3% for lighting, 5% for other circuits (Regulation 525.1).
• Assumes conductor operating at 70°C (thermoplastic) or 90°C (thermosetting) as per the mV/A/m value used.
• Does not account for voltage drop from the supply transformer to the origin of the installation.
• For three-phase, use the 3-phase mV/A/m value from tables (not the single-phase value).
`.trim();

export const voltageDropDefaults = {
  supplyVoltage: 230,
  maxDropPercent: 5,
  current: 32,
  length: 20,
  mvPerAm: 18, // Typical value for 4mm² T&E at 70°C
} as const;
