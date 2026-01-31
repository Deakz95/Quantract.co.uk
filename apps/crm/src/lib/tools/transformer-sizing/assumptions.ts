export const transformerSizingAssumptions = `
• kVA rating calculated as kW / power factor, with configurable growth allowance (default 20%).
• Standard transformer sizes per IEC 60076 preferred ratings.
• Currents calculated for 3-phase (√3 factor). For single-phase, divide secondary current by √3.
• Protection ratings are guidance only. HV fuse selection requires fault-level study.
• Loading percentage shown is without growth allowance — actual loading includes headroom.
• Transformer losses (copper + iron) not included in sizing; oversizing by 20% generally covers this.
`.trim();

export const transformerSizingDefaults = {
  loadKw: 200,
  powerFactor: 0.85,
  primaryVoltage: 11000,
  secondaryVoltage: 400,
  growthAllowance: 0.2,
} as const;
