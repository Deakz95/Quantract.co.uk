import type { HighBayInput, HighBayOutput } from "./schema";

export function calculateHighBay(input: HighBayInput): HighBayOutput {
  const { areaLength, areaWidth, mountingHeight, targetLux, luminaireLumens, targetShr, cu, mf } = input;
  const area = areaLength * areaWidth;
  const totalLumensRequired = (targetLux * area) / (cu * mf);
  const rawCount = totalLumensRequired / luminaireLumens;
  const luminaireCount = Math.max(1, Math.ceil(rawCount));

  const aspectRatio = areaLength / areaWidth;
  let bestRows = 1;
  let bestCols = luminaireCount;
  let bestDiff = Infinity;
  for (let rows = 1; rows <= luminaireCount; rows++) {
    const cols = Math.ceil(luminaireCount / rows);
    if (rows * cols < luminaireCount) continue;
    const gridRatio = cols / rows;
    const diff = Math.abs(gridRatio - aspectRatio);
    if (diff < bestDiff) { bestDiff = diff; bestRows = rows; bestCols = cols; }
  }
  const gridRows = bestRows;
  const gridCols = bestCols;
  const actualCount = gridRows * gridCols;

  const spacingLength = areaLength / gridCols;
  const spacingWidth = areaWidth / gridRows;
  const maxSpacing = Math.max(spacingLength, spacingWidth);
  const actualShr = Math.round((maxSpacing / mountingHeight) * 100) / 100;
  const shrCompliant = actualShr <= targetShr * 1.15;
  const achievedLux = Math.round((actualCount * luminaireLumens * cu * mf) / area);
  const wattsPerSqm: number | null = null;
  const recommendations: string[] = [];

  if (!shrCompliant) {
    recommendations.push("Spacing-to-height ratio (" + actualShr + ") exceeds target (" + targetShr + "). Consider adding luminaires or lowering mounting height.");
  }
  if (achievedLux < targetLux * 0.95) {
    recommendations.push("Achieved lux (" + achievedLux + ") is below target (" + targetLux + "). Consider higher-output luminaires.");
  }
  if (achievedLux > targetLux * 1.3) {
    recommendations.push("Achieved lux (" + achievedLux + ") significantly exceeds target. Consider fewer luminaires or dimming.");
  }
  if (mountingHeight > 12) {
    recommendations.push("Mounting height > 12 m - use narrow-beam optics (< 60 deg) for adequate uniformity.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Layout looks good. Verify uniformity with a lighting simulation tool.");
  }

  return {
    area, luminaireCount: actualCount, gridRows, gridCols,
    spacingLength: Math.round(spacingLength * 100) / 100,
    spacingWidth: Math.round(spacingWidth * 100) / 100,
    actualShr, shrCompliant, achievedLux, wattsPerSqm, recommendations,
  };
}
