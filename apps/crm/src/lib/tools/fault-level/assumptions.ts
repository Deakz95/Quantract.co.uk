export const faultLevelAssumptions = `
ESTIMATOR MODE — Not a substitute for formal IEC 60909 fault level study.

• Uses the Zs method: Ipf = Uo / Zs (BS 7671 Regulation 434).
• Voltage to earth: 230V for single-phase, V/√3 for 3-phase systems.
• Line-to-neutral impedance estimated as 0.8 × Zs when not measured directly.
• Transformer fault level uses: Isc = kVA × 1000 / (√3 × V × Z%).
• Does not account for: motor contribution, arc resistance, cable warming, or upstream source impedance.
• Switchgear rating warnings at 6kA (standard domestic) and 10kA thresholds.
• For formal assessments, use IEC 60909 software and verify with DNO fault level data.
`.trim();

export const faultLevelDefaults = {
  voltage: 230,
  zs: 0.35,
} as const;
