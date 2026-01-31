export const motorFlaAssumptions = `
• Full-load current calculated from motor output power, not input power.
• Default power factor: 0.85, efficiency: 0.90 — typical for standard IE2/IE3 induction motors.
• Starting current estimated at 6× FLA (direct-on-line start). Star-delta reduces to ~2× FLA.
• Cable suggestions are approximate for SWA cable clipped direct. Verify per BS 7671 for actual installation method.
• Protection suggestions are guidance only. Motor circuits typically use Type D MCBs or motor-rated fuses (gM/aM).
• For 3-phase motors, voltage defaults to 400V line-to-line (UK/EU standard).
• Reference: IEC 60034 (motor ratings), BS 7671:2018 Section 552.
`.trim();

export const motorFlaDefaults = {
  powerKw: 7.5,
  phase: "three" as const,
  voltage: 400,
  powerFactor: 0.85,
  efficiency: 0.90,
} as const;
