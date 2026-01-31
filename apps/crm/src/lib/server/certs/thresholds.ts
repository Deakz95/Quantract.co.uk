/**
 * Configurable test thresholds per cert type / test type.
 * Based on BS 7671, BS 5839, BS 5266, IEC 62446 requirements.
 * All values are hard limits — exceeding triggers fail/unsatisfactory.
 */

// ── Electrical (BS 7671) ──

/** Maximum Zs values (Ω) per protective device rating for 0.4s disconnection */
export const ZS_MAX_TABLE: Record<string, number> = {
  // BS 7671 Table 41.3 — Type B MCBs
  "B6": 7.28, "B10": 4.37, "B16": 2.73, "B20": 2.19, "B25": 1.75,
  "B32": 1.37, "B40": 1.09, "B50": 0.87, "B63": 0.69,
  // Type C MCBs
  "C6": 3.64, "C10": 2.19, "C16": 1.37, "C20": 1.09, "C25": 0.87,
  "C32": 0.69, "C40": 0.55, "C50": 0.44, "C63": 0.35,
  // BS 88 Fuses
  "F5": 8.89, "F13": 3.43, "F20": 2.14, "F32": 1.37, "F45": 0.97,
};

/** Minimum insulation resistance (MΩ) per test voltage */
export const IR_MIN: Record<string, number> = {
  "250V": 0.5,   // SELV/PELV circuits
  "500V": 1.0,   // Up to 500V circuits (most domestic/commercial)
  "1000V": 1.0,  // Above 500V circuits
};

/** RCD trip time limits (ms) */
export const RCD_TRIP_MAX_MS: Record<string, number> = {
  "1xIn": 300,     // Rated residual current: max 300ms
  "5xIn": 40,      // 5x rated: max 40ms
};

/** Minimum IR value below which C1 is suggested */
export const IR_CRITICAL_MIN = 0.5; // MΩ — below this is C1 (danger)

/** IR advisory threshold — below IR_MIN but above IR_CRITICAL_MIN is C2 */
export const IR_ADVISORY_MIN = 1.0; // MΩ

// ── Emergency Lighting (BS 5266) ──

export const EL_THRESHOLDS = {
  /** Minimum duration in hours for emergency lighting */
  minDurationHours: 3,
  /** Minimum lux on escape route centre line */
  minLuxEscapeRoute: 1.0,
  /** Minimum lux for anti-panic (open area) */
  minLuxOpenArea: 0.5,
  /** Minimum lux at high-risk task areas */
  minLuxHighRisk: 15,
  /** Maximum uniformity ratio on escape routes */
  maxUniformityRatio: 40,
};

// ── Solar PV (IEC 62446 / MCS) ──

export const SOLAR_THRESHOLDS = {
  /** Minimum insulation resistance DC+ or DC- to earth (MΩ) */
  minIrMohm: 1.0,
  /** Maximum acceptable Voc deviation from expected (%) */
  maxVocDeviationPercent: 10,
  /** Maximum acceptable Isc deviation from expected (%) */
  maxIscDeviationPercent: 15,
  /** Minimum earth continuity resistance — should be < 1Ω typically */
  maxEarthContinuityOhm: 1.0,
};

// ── Fire (BS 5839) ──

export const FIRE_THRESHOLDS = {
  /** Minimum sounder level in occupied areas dB(A) */
  minSounderLevelDb: 65,
  /** Minimum sounder level in bedrooms dB(A) */
  minSounderLevelBedroomDb: 75,
  /** Maximum battery standby period without mains (hours) */
  minBatteryStandbyHours: 24,
  /** Category L systems require > 72h standby in some specs */
  minBatteryStandbyCategoryLHours: 72,
};
