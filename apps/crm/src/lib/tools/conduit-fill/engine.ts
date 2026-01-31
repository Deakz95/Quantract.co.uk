import type { ConduitFillInput, ConduitFillOutput } from "./schema";

/**
 * Calculate conduit fill percentage and check compliance.
 *
 * BS 7671:2018 (Table 4A, Appendix 4, IET On-Site Guide Table 5B):
 *   - Space factor of 45% recommended for conduit with cables drawn in
 *   - This allows for cable pulling and thermal considerations
 *
 * NEC (NFPA 70, Chapter 9, Table 1):
 *   - 1 conductor: 53% fill
 *   - 2 conductors: 31% fill
 *   - 3+ conductors: 40% fill
 *
 * Cable area = π × (d/2)²  for each cable
 * Conduit area = π × (D/2)² using internal diameter
 * Fill % = (total cable area / conduit area) × 100
 */
export function calculateConduitFill(input: ConduitFillInput): ConduitFillOutput {
  const { standard, conduitDiameter, cables } = input;

  const conduitArea = Math.PI * Math.pow(conduitDiameter / 2, 2);

  let totalCableArea = 0;
  let totalCables = 0;

  for (const cable of cables) {
    const cableArea = Math.PI * Math.pow(cable.diameter / 2, 2);
    totalCableArea += cableArea * cable.quantity;
    totalCables += cable.quantity;
  }

  const fillPercent = (totalCableArea / conduitArea) * 100;

  let maxFillPercent: number;
  let spaceFactor: string;

  if (standard === "nec") {
    if (totalCables === 1) {
      maxFillPercent = 53;
      spaceFactor = "NEC Table 1: 1 conductor = 53%";
    } else if (totalCables === 2) {
      maxFillPercent = 31;
      spaceFactor = "NEC Table 1: 2 conductors = 31%";
    } else {
      maxFillPercent = 40;
      spaceFactor = "NEC Table 1: 3+ conductors = 40%";
    }
  } else {
    maxFillPercent = 45;
    spaceFactor = "BS 7671 space factor: 45% (IET On-Site Guide Table 5B)";
  }

  const compliant = fillPercent <= maxFillPercent;

  return {
    totalCableArea: Math.round(totalCableArea * 100) / 100,
    conduitArea: Math.round(conduitArea * 100) / 100,
    fillPercent: Math.round(fillPercent * 100) / 100,
    maxFillPercent,
    compliant,
    totalCables,
    spaceFactor,
  };
}
