import type { LumenMethodInput, LumenMethodOutput } from "./schema";

/**
 * Lumen method for luminaire quantity and spacing calculation.
 *
 * Standard formula:
 *   N = (E × A) / (F × CU × MF)
 *
 * where:
 *   N = number of luminaires required
 *   E = required illuminance (lux)
 *   A = room area (m²)
 *   F = luminaire lumen output per fitting
 *   CU = coefficient of utilization (depends on room geometry and reflectances)
 *   MF = maintenance factor / light loss factor
 *
 * Room Index (RI) = (L × W) / (Hm × (L + W))
 *   where L = length, W = width, Hm = mounting height above working plane
 *
 * Spacing-to-Height Ratio (SHR):
 *   SHR = spacing / Hm
 *   Must not exceed manufacturer’s max SHR (typically 1.0-1.5)
 *
 * Grid layout: optimise for near-square spacing arrangement.
 *
 * Reference: CIBSE Code for Lighting (2012), SLL Lighting Handbook
 */

export function calculateLumenMethod(input: LumenMethodInput): LumenMethodOutput {
  const { targetLux, roomLength, roomWidth, luminaireLumens, cu, mf, mountingHeight, maxShr } = input;

  const roomArea = roomLength * roomWidth;
  const totalLumensRequired = (targetLux * roomArea) / (cu * mf);
  const rawCount = totalLumensRequired / luminaireLumens;
  const luminaireCount = Math.ceil(rawCount);

  // Room index
  let roomIndex: number | null = null;
  if (mountingHeight && mountingHeight > 0) {
    roomIndex = Math.round(((roomLength * roomWidth) / (mountingHeight * (roomLength + roomWidth))) * 100) / 100;
  }

  // Grid layout: find rows × cols closest to luminaireCount with near-square spacing
  const aspectRatio = roomLength / roomWidth;
  let bestCols = 1;
  let bestRows = luminaireCount;
  let bestDiff = Infinity;

  for (let c = 1; c <= luminaireCount; c++) {
    const r = Math.ceil(luminaireCount / c);
    if (r * c < luminaireCount) continue;
    const gridAspect = (r > 0 && c > 0) ? (r / c) : 1;
    const diff = Math.abs(gridAspect - aspectRatio);
    if (r * c <= luminaireCount + Math.ceil(luminaireCount * 0.1) && diff < bestDiff) {
      bestDiff = diff;
      bestRows = r;
      bestCols = c;
    }
  }

  // Ensure we have at least luminaireCount fittings
  if (bestRows * bestCols < luminaireCount) {
    bestRows = Math.ceil(luminaireCount / bestCols);
  }

  const actualCount = bestRows * bestCols;
  const spacingLength = roomLength / bestRows;
  const spacingWidth = roomWidth / bestCols;

  // Achieved lux with actual count
  const achievedLux = Math.round((actualCount * luminaireLumens * cu * mf) / roomArea);

  // SHR check
  let actualShr: number | null = null;
  let shrCompliant = true;
  if (mountingHeight && mountingHeight > 0) {
    const maxSpacing = Math.max(spacingLength, spacingWidth);
    actualShr = Math.round((maxSpacing / mountingHeight) * 100) / 100;
    shrCompliant = actualShr <= maxShr;
  }

  return {
    roomArea: Math.round(roomArea * 100) / 100,
    totalLumensRequired: Math.round(totalLumensRequired),
    luminaireCount: actualCount,
    achievedLux,
    roomIndex,
    gridRows: bestRows,
    gridCols: bestCols,
    spacingLength: Math.round(spacingLength * 100) / 100,
    spacingWidth: Math.round(spacingWidth * 100) / 100,
    shrCompliant,
    actualShr,
  };
}
