export const conduitBendingAssumptions = `
• Offset bend formula: mark spacing = offset / sin(angle). Common angles: 10°, 22.5°, 30°, 45°, 60°.
• Saddle bend (3-bend): center bend at chosen angle, outer bends at half that angle. Outer mark multipliers are approximate workshop values.
• 90° bend take-up values are typical for hand benders. Exact deduct depends on your specific bender — consult its chart.
• Shrinkage values are approximations. Always measure and verify on a practice piece first.
• All measurements in millimetres. Conduit diameter refers to nominal bore size.
`.trim();

export const conduitBendingDefaults = {
  bendType: "offset" as const,
  offsetHeight: 50,
  bendAngle: 30,
  conduitDiameter: 20,
} as const;
