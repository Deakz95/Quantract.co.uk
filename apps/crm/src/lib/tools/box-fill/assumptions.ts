export const boxFillAssumptions = `
• BS 7671 does not specify exact box fill volumes; guidance values used are practical approximations.
• A practical 80% fill limit is applied for BS 7671 to allow for workmanship.
• NEC Article 314.16 volumes are from Table 314.16(B); 100% of box volume is the limit.
• Device and clamp volumes are simplified equivalents.
• Always ensure adequate space for connections and heat dissipation in practice.`.trim();

export const boxFillDefaults = {
  standard: "bs7671" as const,
  boxVolume: 47,
  items: [
    { type: "conductor" as const, conductorSize: 2.5, quantity: 6 },
    { type: "device" as const, quantity: 1 },
  ],
} as const;
