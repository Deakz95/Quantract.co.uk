export const energyRoiAssumptions = `
• Electricity cost default: 34p/kWh (UK Ofgem price cap rate — verify current rates).
• CO2 factor: 0.207 kg CO2/kWh (DEFRA 2023 UK grid average — decreasing annually).
• Assumes constant electricity prices over payback period (no inflation adjustment).
• Fitting cost should include material + installation labour.
• Does not account for maintenance savings (LED typically lasts 25,000-50,000 hours vs 1,000-2,000 for halogen).
• Operating hours are averaged; actual savings depend on usage patterns.`.trim();

export const energyRoiDefaults = {
  fittingCount: 50,
  existingWatts: 50,
  replacementWatts: 8,
  dailyHours: 10,
  daysPerYear: 365,
  costPerKwh: 34,
  costPerFitting: 25,
} as const;
