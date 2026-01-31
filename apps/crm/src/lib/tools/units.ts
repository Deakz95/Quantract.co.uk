/**
 * Unit conversion helpers for electrical calculations.
 * All internal calculations use SI base units unless noted.
 */

/** Convert millivolts to volts */
export function mvToV(mv: number): number {
  return mv / 1000;
}

/** Convert mm² to m² */
export function mm2ToM2(mm2: number): number {
  return mm2 / 1_000_000;
}

/** Convert watts to kilowatts */
export function wToKW(w: number): number {
  return w / 1000;
}

/** Convert kilowatts to watts */
export function kwToW(kw: number): number {
  return kw * 1000;
}

/** Convert kVA to VA */
export function kvaToVA(kva: number): number {
  return kva * 1000;
}

/** Format a number to fixed decimal places, stripping trailing zeros */
export function fmt(value: number, decimals: number = 2): string {
  return Number(value.toFixed(decimals)).toString();
}

/** Format as percentage */
export function fmtPct(value: number, decimals: number = 1): string {
  return `${fmt(value, decimals)}%`;
}

/** Format as voltage */
export function fmtV(value: number, decimals: number = 2): string {
  return `${fmt(value, decimals)} V`;
}

/** Format as amps */
export function fmtA(value: number, decimals: number = 1): string {
  return `${fmt(value, decimals)} A`;
}

/** Format as mm² */
export function fmtMm2(value: number): string {
  return `${fmt(value, 1)} mm²`;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Round up to next standard cable size in mm² */
export const STANDARD_CABLE_SIZES_MM2 = [1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300] as const;

export function nextStandardCableSize(minMm2: number): number | null {
  return STANDARD_CABLE_SIZES_MM2.find((s) => s >= minMm2) ?? null;
}
