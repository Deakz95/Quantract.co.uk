export const conduitFillAssumptions = `
• Cable areas calculated from overall cable diameter (including insulation sheath).
• BS 7671 uses a 45% space factor as recommended in IET On-Site Guide Table 5B.
• NEC fill limits per NFPA 70 Chapter 9 Table 1 (53%/31%/40% for 1/2/3+ conductors).
• Conduit diameter should be the internal bore, not the external diameter.
• Does not account for bends, which further restrict cable pulling. Reduce fill for runs with many bends.
• For trunking, different space factors apply (BS 7671 recommends 45% for trunking as well).
`.trim();

export const conduitFillDefaults = {
  standard: "bs7671" as const,
  conduitDiameter: 20,
  cables: [{ diameter: 9.0, quantity: 3 }],
} as const;
