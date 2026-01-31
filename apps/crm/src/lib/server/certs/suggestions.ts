/**
 * Observation intelligence — deterministic lookup table.
 * Maps test measurements to suggested observation codes.
 * No AI dependency — pure threshold-based logic.
 */

import { getTypeCategory } from "./types";
import {
  ZS_MAX_TABLE,
  IR_CRITICAL_MIN,
  IR_ADVISORY_MIN,
  RCD_TRIP_MAX_MS,
  EL_THRESHOLDS,
  SOLAR_THRESHOLDS,
} from "./thresholds";

export type ObservationCode = "C1" | "C2" | "C3" | "FI" | "Critical" | "Major" | "Minor" | "Info";

export type ObservationSuggestion = {
  code: ObservationCode;
  reason: string;
  regulation?: string;
  fixGuidance?: string;
};

export type MeasurementInput = {
  field: string;
  value: number;
  unit: string;
  /** Optional context: e.g. device type for Zs lookup */
  context?: Record<string, string>;
};

/**
 * Suggest an observation code based on a measurement.
 * Returns null if the value is within acceptable range.
 */
export function suggestObservationCode(
  type: string,
  measurement: MeasurementInput,
): ObservationSuggestion | null {
  const category = getTypeCategory(type);
  if (!category) return null;

  switch (category) {
    case "electrical":
      return suggestElectrical(measurement);
    case "fire":
      return suggestFire(measurement);
    case "emergency_lighting":
      return suggestEmergencyLighting(measurement);
    case "solar_pv":
      return suggestSolar(measurement);
    default:
      return null;
  }
}

// ── Electrical suggestions ──

function suggestElectrical(m: MeasurementInput): ObservationSuggestion | null {
  const f = m.field.toLowerCase();

  // Zs (earth fault loop impedance)
  if (f === "zs" || f === "earth_fault_loop") {
    const deviceType = m.context?.deviceType?.toUpperCase();
    if (deviceType && ZS_MAX_TABLE[deviceType] !== undefined) {
      const max = ZS_MAX_TABLE[deviceType];
      if (m.value > max * 1.5) {
        return {
          code: "C1",
          reason: `Zs ${m.value}Ω significantly exceeds maximum ${max}Ω for ${deviceType} — disconnection time likely exceeded.`,
          regulation: "BS 7671:2018 411.3.3",
          fixGuidance: "Investigate and reduce earth fault loop impedance. May need cable upgrade, shorter circuit length, or different protective device.",
        };
      }
      if (m.value > max) {
        return {
          code: "C2",
          reason: `Zs ${m.value}Ω exceeds maximum ${max}Ω for ${deviceType}.`,
          regulation: "BS 7671:2018 411.3.3",
          fixGuidance: "Review circuit design and protective device. Consider using RCD for additional protection.",
        };
      }
    }
    return null;
  }

  // IR (insulation resistance)
  if (f === "ir" || f === "insulation_resistance") {
    if (m.value < IR_CRITICAL_MIN) {
      return {
        code: "C1",
        reason: `Insulation resistance ${m.value}MΩ below critical minimum ${IR_CRITICAL_MIN}MΩ — risk of electric shock or fire.`,
        regulation: "BS 7671:2018 612.3",
        fixGuidance: "Isolate circuit immediately. Locate and repair insulation fault before re-energising.",
      };
    }
    if (m.value < IR_ADVISORY_MIN) {
      return {
        code: "C2",
        reason: `Insulation resistance ${m.value}MΩ below standard minimum ${IR_ADVISORY_MIN}MΩ.`,
        regulation: "BS 7671:2018 612.3",
        fixGuidance: "Investigate cause of low insulation resistance. Check for moisture ingress or damaged cables.",
      };
    }
    return null;
  }

  // RCD trip time
  if (f === "rcd" || f === "rcd_ms" || f === "rcd_trip") {
    if (m.value > RCD_TRIP_MAX_MS["1xIn"]) {
      return {
        code: "C1",
        reason: `RCD trip time ${m.value}ms exceeds maximum ${RCD_TRIP_MAX_MS["1xIn"]}ms — protection not operating.`,
        regulation: "BS 7671:2018 411.5.3",
        fixGuidance: "Replace RCD. Test replacement device before re-energising circuit.",
      };
    }
    if (m.value > RCD_TRIP_MAX_MS["5xIn"]) {
      return {
        code: "C2",
        reason: `RCD trip time ${m.value}ms is slow at rated current (advisory limit ${RCD_TRIP_MAX_MS["5xIn"]}ms at 5×In).`,
        regulation: "BS 7671:2018 411.5.3",
        fixGuidance: "Consider replacing RCD. May be worn or have internal fault.",
      };
    }
    return null;
  }

  // Missing bonding
  if (f === "bonding" || f === "main_bonding") {
    if (m.value === 0) {
      return {
        code: "C2",
        reason: "Main protective bonding conductor absent or disconnected.",
        regulation: "BS 7671:2018 411.3.1.2",
        fixGuidance: "Install main protective bonding to gas, water, and oil services as required.",
      };
    }
    return null;
  }

  // Missing labels
  if (f === "labels" || f === "circuit_labels") {
    if (m.value === 0) {
      return {
        code: "C3",
        reason: "Circuit identification labels missing from distribution board.",
        regulation: "BS 7671:2018 514.8.1",
        fixGuidance: "Apply durable circuit identification labels to all ways in distribution board.",
      };
    }
    return null;
  }

  return null;
}

// ── Fire suggestions ──

function suggestFire(m: MeasurementInput): ObservationSuggestion | null {
  const f = m.field.toLowerCase();

  if (f === "sounder_level" || f === "sounder_db") {
    if (m.value < SOLAR_THRESHOLDS.minIrMohm) {
      // Using fire thresholds — this is just a placeholder pattern
    }
    // Use the correct fire threshold
    const min = m.context?.location === "bedroom" ? 75 : 65;
    if (m.value < min) {
      return {
        code: "Critical",
        reason: `Sounder level ${m.value}dB(A) below minimum ${min}dB(A) for ${m.context?.location || "occupied area"}.`,
        regulation: "BS 5839-1 cl.17.5",
        fixGuidance: "Add additional sounders or replace with higher output devices to achieve minimum levels.",
      };
    }
    return null;
  }

  if (f === "battery_standby" || f === "battery_hours") {
    if (m.value < 24) {
      return {
        code: "Critical",
        reason: `Battery standby ${m.value}h below minimum 24h requirement.`,
        regulation: "BS 5839-1 cl.25.2",
        fixGuidance: "Replace standby batteries. Check charger operation.",
      };
    }
    return null;
  }

  return null;
}

// ── Emergency Lighting suggestions ──

function suggestEmergencyLighting(m: MeasurementInput): ObservationSuggestion | null {
  const f = m.field.toLowerCase();

  if (f === "duration" || f === "duration_hours") {
    if (m.value < EL_THRESHOLDS.minDurationHours) {
      return {
        code: "Critical",
        reason: `Duration ${m.value}h below minimum ${EL_THRESHOLDS.minDurationHours}h.`,
        regulation: "BS 5266-1 cl.5.3",
        fixGuidance: "Replace luminaire battery pack or entire unit. Re-test after replacement.",
      };
    }
    return null;
  }

  if (f === "lux" || f === "lux_level") {
    if (m.value < EL_THRESHOLDS.minLuxEscapeRoute) {
      return {
        code: "Critical",
        reason: `Lux level ${m.value} below minimum ${EL_THRESHOLDS.minLuxEscapeRoute} lux for escape route.`,
        regulation: "BS 5266-1 cl.5.5",
        fixGuidance: "Add additional emergency luminaires to achieve minimum illumination.",
      };
    }
    return null;
  }

  return null;
}

// ── Solar suggestions ──

function suggestSolar(m: MeasurementInput): ObservationSuggestion | null {
  const f = m.field.toLowerCase();

  if (f === "ir" || f === "ir_mohm" || f === "insulation_resistance") {
    if (m.value < SOLAR_THRESHOLDS.minIrMohm) {
      return {
        code: "Critical",
        reason: `Insulation resistance ${m.value}MΩ below minimum ${SOLAR_THRESHOLDS.minIrMohm}MΩ.`,
        regulation: "IEC 62446-1 cl.7.4",
        fixGuidance: "Investigate DC wiring for damage. Check module junction boxes and connectors. Do not energise until resolved.",
      };
    }
    return null;
  }

  if (f === "earth_continuity" || f === "earth_r") {
    if (m.value > SOLAR_THRESHOLDS.maxEarthContinuityOhm) {
      return {
        code: "Critical",
        reason: `Earth continuity ${m.value}Ω exceeds maximum ${SOLAR_THRESHOLDS.maxEarthContinuityOhm}Ω.`,
        regulation: "IEC 62446-1 cl.7.3",
        fixGuidance: "Check all earth bonding connections. Ensure frame earthing is continuous throughout array.",
      };
    }
    return null;
  }

  if (f === "voc_deviation" || f === "voc_deviation_percent") {
    if (m.value > SOLAR_THRESHOLDS.maxVocDeviationPercent) {
      return {
        code: "Major",
        reason: `Voc deviation ${m.value}% exceeds threshold ${SOLAR_THRESHOLDS.maxVocDeviationPercent}%.`,
        regulation: "IEC 62446-1 cl.7.2",
        fixGuidance: "Check for shaded or faulty modules. Verify string configuration matches design.",
      };
    }
    return null;
  }

  return null;
}
