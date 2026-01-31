import type { UgrInput, UgrOutput } from "./schema";

/**
 * Simplified UGR estimation (Estimator Mode).
 * UGR = 8 * log10( (0.25 / Lb) * sum( L^2 * omega / p^2 ) )
 *
 * Where:
 *   Lb = background luminance (cd/m2)
 *   L  = luminaire luminance (cd/m2) = lumens / (pi * area)
 *   omega = solid angle subtended at observer
 *   p  = Guth position index (simplified to 1.5)
 */
export function calculateUgr(input: UgrInput): UgrOutput {
  const {
    roomLength, roomWidth, luminaireHeight,
    luminaireLumens, numberOfLuminaires,
    luminaireArea, backgroundLuminance,
  } = input;

  // Luminaire luminance (cd/m2) - lambertian: L = lumens / (pi * A)
  const L = luminaireLumens / (Math.PI * luminaireArea);

  // Average distance from observer to luminaire (simplified)
  const avgHorizontalDist = Math.sqrt(roomLength * roomWidth) / 3;
  const avgDist = Math.sqrt(
    luminaireHeight * luminaireHeight + avgHorizontalDist * avgHorizontalDist
  );

  // Solid angle: omega = A / d^2
  const omega = luminaireArea / (avgDist * avgDist);

  // Guth position index (simplified average for recessed luminaires)
  const p = 1.5;

  // UGR summation over all luminaires
  const sumTerm = numberOfLuminaires * (L * L * omega) / (p * p);
  const ugrRaw = 8 * Math.log10((0.25 / backgroundLuminance) * sumTerm);
  const ugr = Math.round(ugrRaw * 10) / 10;

  // Standard UGR limits by task type
  const taskLimits = { office: 19, industrial: 22, corridor: 25 };

  let rating: "acceptable" | "borderline" | "excessive";
  if (ugr <= taskLimits.office) {
    rating = "acceptable";
  } else if (ugr <= taskLimits.corridor) {
    rating = "borderline";
  } else {
    rating = "excessive";
  }

  const recommendations: string[] = [];
  if (ugr > taskLimits.office) {
    recommendations.push("UGR exceeds office limit (19). Use lower-luminance fittings or add louvres.");
  }
  if (ugr > taskLimits.corridor) {
    recommendations.push("UGR exceeds corridor limit (25). Redesign layout or use indirect lighting.");
  }
  if (luminaireArea < 0.05) {
    recommendations.push("Very small luminaire area increases luminance. Consider larger diffusers.");
  }
  if (recommendations.length === 0) {
    recommendations.push("UGR is within acceptable limits for all common task types.");
  }

  return { ugr, rating, taskLimits, recommendations };
}
