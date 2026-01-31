export const maxDemandAssumptions = `
• Diversity factors are simplified flat percentages for ease of use.
• For precise domestic assessments, refer to IET On-Site Guide Table 1B which provides tiered diversity rules.
• Default profiles: Domestic 60%, Commercial 70%, Industrial 80%, Custom 100% (set per-item).
• Individual load items can override the profile default with a custom diversity factor.
• Supply voltage assumed as 230V single-phase unless specified otherwise.
• Suggested supply rating rounds up to next standard UK supply size.
• This is an estimation tool — for formal maximum demand assessments, follow IET On-Site Guide methodology.
`.trim();

export const maxDemandDefaults = {
  profile: "domestic" as const,
  supplyVoltage: 230,
  loads: [
    { description: "Lighting points", connectedLoad: 100, quantity: 15 },
    { description: "Ring main (sockets)", connectedLoad: 3680, quantity: 2 },
    { description: "Cooker", connectedLoad: 10000, quantity: 1 },
    { description: "Shower (instantaneous)", connectedLoad: 9000, quantity: 1 },
    { description: "Immersion heater", connectedLoad: 3000, quantity: 1 },
  ],
} as const;
