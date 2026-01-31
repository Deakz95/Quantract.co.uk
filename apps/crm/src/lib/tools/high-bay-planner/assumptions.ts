export const highBayAssumptions = [
  "Uses the lumen method: Total lumens = (target lux x area) / (CU x MF).",
  "Default CU of 0.5 is typical for high-bay spaces with dark surfaces.",
  "Default MF of 0.7 accounts for luminaire depreciation and dust.",
  "Grid layout optimises row x column arrangement to match room aspect ratio.",
  "SHR compliance allows 15% tolerance above target value.",
  "SHR target of 1.0 is standard for high-bay LED luminaires.",
  "Verify uniformity with simulation software (e.g. DIALux, Relux).",
  "Mounting height above 12 m typically requires narrow-beam optics.",
].join("\n");

export const highBayDefaults = {
  areaLength: 40,
  areaWidth: 20,
  mountingHeight: 8,
  targetLux: 300,
  luminaireLumens: 30000,
  targetShr: 1.0,
  cu: 0.5,
  mf: 0.7,
} as const;