export const powerFactorAssumptions = `
• Calculates required capacitor bank kVAR using: kVAR = P × (tan φ1 − tan φ2).
• Assumes 3-phase balanced load for current calculations.
• Target PF default is 0.95 — UK DNOs typically require ≥ 0.95 to avoid reactive charges.
• Does not account for harmonic distortion — capacitor banks may need detuning reactors in harmonic-rich environments.
• Capacitor bank should be sized to next available standard kVAR rating.
• Reference: IEC 61921 (power factor correction capacitors).
`.trim();

export const powerFactorDefaults = {
  activeKw: 200,
  currentPf: 0.75,
  targetPf: 0.95,
  voltage: 400,
} as const;
