import type { ConduitBendingInput, ConduitBendingOutput, BendType } from "./schema";

/**
 * Conduit bending calculations.
 *
 * OFFSET BEND:
 *   Two equal-angle bends to move the conduit laterally around an obstruction.
 *   Mark spacing = offset height / sin(angle)
 *   Shrinkage = offset height ° (1/tan(angle) - 1/tan(90°))
 *             = offset height / tan(angle) (simplified since tan(90°) -> inf)
 *   Common shrinkage multipliers:
 *     10° -> 1/16" per inch
 *     22.5° -> 3/16" per inch
 *     30° -> 1/4" per inch -- most common
 *     45° -> 3/8" per inch
 *     60° -> 1/2" per inch
 *
 * SADDLE BEND (3-bend):
 *   Center bend at specified angle (typically 45°), two outer bends at half that angle.
 *   Center mark at obstruction center.
 *   Outer marks = offset height ° multiplier from center.
 *     For 45° center: outer marks at 2.5 x offset height from center.
 *     For 22.5° center: outer marks at 5 x offset height from center.
 *   Shrinkage ~ 3/16" per inch of offset for 45° saddle.
 *
 * 90° BEND:
 *   Gain = stub-up height - (stub-up - take-up)
 *   Take-up varies by conduit size (deduct from stub-up mark):
 *     20mm (3/4"): 150mm take-up
 *     25mm (1"): 200mm take-up
 *     32mm (1-1/4"): 250mm take-up
 *
 * These are practical workshop values; exact values depend on the bender used.
 */

/** Take-up values for 90° bends by conduit diameter (mm) */
const NINETY_TAKEUP: Record<number, number> = {
  16: 100,
  20: 150,
  25: 200,
  32: 250,
  40: 300,
  50: 350,
};

/** Gain for 90° bend = radius - deduct. Approximated as conduit_diameter x 2 */
function getNinetyGain(conduitDiameter: number): number {
  // Gain ~ stub-up deduct - (conduit OD contribution)
  // Simplified: gain = take-up x (1 - pi/4) ~ take-up x 0.215
  // But more practically, gain = bend radius - take-up + stub
  // Using common practical values:
  const takeup = NINETY_TAKEUP[conduitDiameter] ?? Math.round(conduitDiameter * 7.5);
  return Math.round(takeup * 0.215);
}

export function calculateConduitBending(input: ConduitBendingInput): ConduitBendingOutput {
  const { bendType, offsetHeight, bendAngle, conduitDiameter } = input;

  switch (bendType) {
    case "offset": {
      const height = offsetHeight ?? 50;
      const angle = bendAngle ?? 30;
      const angleRad = (angle * Math.PI) / 180;

      const markSpacing = height / Math.sin(angleRad);
      const shrinkage = height / Math.tan(angleRad);

      return {
        bendType,
        description: `${angle}° offset bend, ${height}mm offset`,
        markSpacing: Math.round(markSpacing * 10) / 10,
        shrinkage: Math.round(shrinkage * 10) / 10,
        angleUsed: angle,
        gain: null,
        steps: [
          `Mark first bend point on conduit at desired location.`,
          `Measure ${Math.round(markSpacing)}mm from first mark for second bend.`,
          `Bend first mark to ${angle}° in one direction.`,
          `Bend second mark to ${angle}° in opposite direction.`,
          `Account for ${Math.round(shrinkage)}mm shrinkage in your measurements.`,
        ],
      };
    }

    case "saddle": {
      const height = offsetHeight ?? 50;
      const centerAngle = bendAngle ?? 45;
      const outerAngle = centerAngle / 2;

      // Outer mark distance depends on center angle
      let outerMultiplier: number;
      if (centerAngle <= 30) {
        outerMultiplier = 5;
      } else if (centerAngle <= 45) {
        outerMultiplier = 2.5;
      } else {
        outerMultiplier = 1.5;
      }

      const outerMarkDistance = height * outerMultiplier;
      // Shrinkage for saddle ~ 3/16 per inch x offset for 45° center
      const shrinkage = height * 0.1875 * (45 / centerAngle);

      return {
        bendType,
        description: `3-bend saddle, ${centerAngle}° center, ${height}mm clearance`,
        markSpacing: Math.round(outerMarkDistance * 10) / 10,
        shrinkage: Math.round(shrinkage * 10) / 10,
        angleUsed: centerAngle,
        gain: null,
        steps: [
          `Mark center of obstruction on conduit.`,
          `Mark ${Math.round(outerMarkDistance)}mm each side of center mark (2 outer marks).`,
          `Bend center mark to ${centerAngle}° (away from obstruction).`,
          `Bend each outer mark to ${Math.round(outerAngle)}° (toward obstruction).`,
          `Account for approximately ${Math.round(shrinkage)}mm shrinkage.`,
        ],
      };
    }

    case "ninety": {
      const takeup = NINETY_TAKEUP[conduitDiameter] ?? Math.round(conduitDiameter * 7.5);
      const gain = getNinetyGain(conduitDiameter);

      return {
        bendType,
        description: `90° bend for ${conduitDiameter}mm conduit`,
        markSpacing: null,
        shrinkage: null,
        angleUsed: 90,
        gain,
        steps: [
          `Measure desired stub-up length on conduit.`,
          `Subtract ${takeup}mm (take-up/deduct) from stub-up length.`,
          `Mark the conduit at this adjusted point.`,
          `Place mark at bender's arrow/notch.`,
          `Bend to 90° using a spirit level to check.`,
          `Gain: the bend adds approximately ${gain}mm to the overall run.`,
        ],
      };
    }
  }
}

