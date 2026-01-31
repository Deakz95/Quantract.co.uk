import type { BoxFillInput, BoxFillOutput } from "./schema";

/**
 * Box fill calculator.
 *
 * BS 7671: Regulation 521.15.1 requires adequate space for conductors
 * and connections. The IET On-Site Guide Table 4E gives guidance factors
 * for space in accessory boxes. General rule: each conductor occupies a
 * volume based on its cross-section, and total should not exceed box capacity.
 *
 * NEC (NFPA 70) Article 314.16: Box fill calculation based on conductor
 * equivalents. Each conductor = volume from Table 314.16(B).
 *
 * Simplified approach: calculate total conductor volume and compare to box volume.
 * BS 7671 does not specify exact fill percentages for back boxes, but
 * a practical 80% fill limit is commonly used to allow for workmanship.
 * NEC specifies exact volumes per conductor size.
 */

/** Volume per conductor in cm³ by size (mm²) — practical guidance values */
const BS_CONDUCTOR_VOLUME: Record<number, number> = {
  1: 3.0, 1.5: 4.5, 2.5: 6.5, 4: 9.0, 6: 13.0, 10: 20.0, 16: 30.0,
};

/** NEC Table 314.16(B) — volume allowance per conductor in cubic inches */
const NEC_CONDUCTOR_VOLUME: Record<number, number> = {
  1.5: 2.0, 2.5: 2.0, 4: 2.25, 6: 2.5, 10: 3.0, 16: 3.5, 25: 5.0,
};

export function calculateBoxFill(input: BoxFillInput): BoxFillOutput {
  const { standard, boxVolume, items } = input;
  const isNec = standard === "nec";
  const volumeTable = isNec ? NEC_CONDUCTOR_VOLUME : BS_CONDUCTOR_VOLUME;
  const unit = isNec ? "in³" : "cm³";
  const maxFillPercent = isNec ? 100 : 80;

  const itemBreakdown: BoxFillOutput["itemBreakdown"] = [];
  let totalVolume = 0;

  for (const item of items) {
    let volumeEach: number;

    if (item.type === "conductor") {
      const size = item.conductorSize ?? 2.5;
      volumeEach = volumeTable[size] ?? (isNec ? 2.0 : 6.5);
    } else if (item.type === "clamp") {
      volumeEach = isNec ? 2.25 : 5.0;
    } else if (item.type === "device") {
      volumeEach = isNec ? 4.5 : 10.0;
    } else if (item.type === "equipment_ground") {
      volumeEach = isNec ? 2.25 : 5.0;
    } else {
      volumeEach = isNec ? 2.25 : 5.0;
    }

    const volumeTotal = volumeEach * item.quantity;
    totalVolume += volumeTotal;
    itemBreakdown.push({
      type: item.type,
      quantity: item.quantity,
      volumeEach: Math.round(volumeEach * 100) / 100,
      volumeTotal: Math.round(volumeTotal * 100) / 100,
    });
  }

  const fillPercent = (totalVolume / boxVolume) * 100;
  const compliant = fillPercent <= maxFillPercent;

  return {
    totalVolume: Math.round(totalVolume * 100) / 100,
    boxVolume,
    fillPercent: Math.round(fillPercent * 100) / 100,
    compliant,
    maxFillPercent,
    unit,
    itemBreakdown,
  };
}
