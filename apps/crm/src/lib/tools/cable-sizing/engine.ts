import type { CableSizingInput, CableSizingOutput, CableOption, CableType } from "./schema";

/**
 * Cable data: current ratings (It) and mV/A/m values.
 * Source: BS 7671:2018 Appendix 4, Tables 4D1A-4D5A (current ratings),
 * Tables 4Ab (voltage drop).
 *
 * Current ratings are for Reference Method C (clipped direct) for T&E,
 * Reference Method B (enclosed in conduit/trunking) for singles,
 * and Reference Method E (free air, trefoil touching) for SWA.
 *
 * Note: These are representative values for guidance. Users should verify
 * against their copy of BS 7671 for the specific installation method.
 */
interface CableSpec {
  size: number;
  currentRating: number;
  mvPerAm: number;
}

const CABLE_DATA: Record<CableType, { name: string; sizes: CableSpec[] }> = {
  "twin-earth": {
    name: "Twin & Earth (6242Y)",
    sizes: [
      { size: 1.0, currentRating: 14, mvPerAm: 44 },
      { size: 1.5, currentRating: 18, mvPerAm: 29 },
      { size: 2.5, currentRating: 24, mvPerAm: 18 },
      { size: 4, currentRating: 32, mvPerAm: 11 },
      { size: 6, currentRating: 41, mvPerAm: 7.3 },
      { size: 10, currentRating: 55, mvPerAm: 4.4 },
      { size: 16, currentRating: 73, mvPerAm: 2.8 },
    ],
  },
  singles: {
    name: "Singles in Conduit (6491X)",
    sizes: [
      { size: 1.0, currentRating: 13.5, mvPerAm: 44 },
      { size: 1.5, currentRating: 17.5, mvPerAm: 29 },
      { size: 2.5, currentRating: 24, mvPerAm: 18 },
      { size: 4, currentRating: 32, mvPerAm: 11 },
      { size: 6, currentRating: 41, mvPerAm: 7.3 },
      { size: 10, currentRating: 57, mvPerAm: 4.4 },
      { size: 16, currentRating: 76, mvPerAm: 2.8 },
      { size: 25, currentRating: 101, mvPerAm: 1.75 },
      { size: 35, currentRating: 125, mvPerAm: 1.25 },
      { size: 50, currentRating: 151, mvPerAm: 0.93 },
    ],
  },
  swa: {
    name: "SWA Cable (6944X)",
    sizes: [
      { size: 1.5, currentRating: 21, mvPerAm: 29 },
      { size: 2.5, currentRating: 28, mvPerAm: 18 },
      { size: 4, currentRating: 37, mvPerAm: 11 },
      { size: 6, currentRating: 47, mvPerAm: 7.3 },
      { size: 10, currentRating: 65, mvPerAm: 4.4 },
      { size: 16, currentRating: 85, mvPerAm: 2.8 },
      { size: 25, currentRating: 110, mvPerAm: 1.75 },
      { size: 35, currentRating: 135, mvPerAm: 1.25 },
      { size: 50, currentRating: 164, mvPerAm: 0.93 },
      { size: 70, currentRating: 205, mvPerAm: 0.63 },
      { size: 95, currentRating: 250, mvPerAm: 0.46 },
      { size: 120, currentRating: 290, mvPerAm: 0.375 },
    ],
  },
  flex: {
    name: "Flexible Cable (3183Y)",
    sizes: [
      { size: 0.75, currentRating: 6, mvPerAm: 60 },
      { size: 1.0, currentRating: 10, mvPerAm: 44 },
      { size: 1.5, currentRating: 13, mvPerAm: 29 },
      { size: 2.5, currentRating: 18, mvPerAm: 18 },
      { size: 4, currentRating: 25, mvPerAm: 11 },
    ],
  },
};

/**
 * Select cable size per BS 7671:2018 Regulation 433.1:
 *   It >= In >= Ib  and  It >= Ib / (Ca × Cg × Ci)
 *
 * where:
 *   Ib = design current
 *   In = nominal rating of protective device
 *   It = tabulated current rating (current-carrying capacity)
 *   Ca = ambient temperature correction (Table 4B1)
 *   Cg = grouping correction (Table 4C1)
 *   Ci = thermal insulation correction (Table 52.2)
 *
 * Voltage drop check per Regulation 525.1:
 *   VD = mV/A/m × Ib × L / 1000
 */
export function calculateCableSizing(input: CableSizingInput): CableSizingOutput {
  const { designCurrent, cableType, ca, cg, ci, circuitType, supplyVoltage, length } = input;

  const correctionFactor = ca * cg * ci;
  const requiredCcc = designCurrent / correctionFactor;
  const maxDropPercent = circuitType === "lighting" ? 3 : 5;

  const cableSpecs = CABLE_DATA[cableType].sizes;

  const options: CableOption[] = cableSpecs.map((spec) => {
    const deratedRating = spec.currentRating * correctionFactor;
    const meetsCurrentRating = deratedRating >= designCurrent;

    let voltageDrop: number | null = null;
    let voltageDropPercent: number | null = null;
    let meetsVoltageDrop: boolean | null = null;

    if (length) {
      voltageDrop = Math.round(((spec.mvPerAm * designCurrent * length) / 1000) * 100) / 100;
      voltageDropPercent = Math.round(((voltageDrop / supplyVoltage) * 100) * 100) / 100;
      meetsVoltageDrop = voltageDropPercent <= maxDropPercent;
    }

    const compliant = meetsCurrentRating && (meetsVoltageDrop === null || meetsVoltageDrop);

    return {
      size: spec.size,
      currentRating: spec.currentRating,
      deratedRating: Math.round(deratedRating * 10) / 10,
      mvPerAm: spec.mvPerAm,
      voltageDrop,
      voltageDropPercent,
      meetsCurrentRating,
      meetsVoltageDrop,
      compliant,
    };
  });

  const recommendedSize = options.find((o) => o.compliant)?.size ?? null;

  return {
    requiredCcc: Math.round(requiredCcc * 10) / 10,
    correctionFactor: Math.round(correctionFactor * 1000) / 1000,
    options,
    recommendedSize,
    maxDropPercent,
  };
}

export { CABLE_DATA };
