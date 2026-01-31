export const ugrAssumptions = [
  "Estimator Mode - simplified UGR calculation for early-stage design guidance.",
  "Uses the CIE Unified Glare Rating formula: UGR = 8 * log10(0.25/Lb * sum(L^2*omega/p^2)).",
  "Luminaire luminance assumes Lambertian emission: L = lumens / (pi * area).",
  "Solid angle calculated from average observer-to-luminaire distance.",
  "Guth position index simplified to p = 1.5 (average for recessed fittings).",
  "Standard task limits: office <= 19, industrial <= 22, corridor <= 25.",
  "For accurate UGR use manufacturer photometric data and DIALux/Relux.",
  "Does not account for luminaire optics, reflector geometry, or room surface reflectances.",
].join("\n");

export const ugrDefaults = {
  roomLength: 8,
  roomWidth: 6,
  luminaireHeight: 2.2,
  luminaireLumens: 5000,
  numberOfLuminaires: 12,
  luminaireArea: 0.12,
  backgroundLuminance: 20,
} as const;
