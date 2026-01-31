export const lumenMethodAssumptions = `
• Uses the lumen method formula: N = (E × A) / (F × CU × MF).
• Coefficient of utilization (CU) depends on room geometry, reflectances, and luminaire type. Default 0.6 is typical for office environments.
• Maintenance factor (MF) accounts for lamp depreciation and dirt accumulation. Default 0.8 is typical for clean environments with 3-year maintenance cycle.
• Grid layout optimised for near-square spacing to match room aspect ratio.
• Spacing-to-Height Ratio (SHR) must not exceed the luminaire manufacturer’s maximum (typically 1.0-1.5).
• Room Index (RI) calculated when mounting height is provided: RI = (L × W) / (Hm × (L + W)).
• Reference: CIBSE Code for Lighting, SLL Lighting Handbook.
• Typical lux levels: Office 300-500 lux, Classroom 300 lux, Workshop 500 lux, Warehouse 150-300 lux.
`.trim();

export const lumenMethodDefaults = {
  targetLux: 500,
  roomLength: 10,
  roomWidth: 8,
  luminaireLumens: 5000,
  cu: 0.6,
  mf: 0.8,
  mountingHeight: 2.8,
  maxShr: 1.5,
} as const;
