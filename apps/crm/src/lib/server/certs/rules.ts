/**
 * Deterministic certificate outcome rules engine.
 * Pure functions — no side effects, no network, no AI.
 */

import { getTypeCategory, type TypeCategory } from "./types";
import {
  ZS_MAX_TABLE,
  IR_CRITICAL_MIN,
  IR_ADVISORY_MIN,
  RCD_TRIP_MAX_MS,
  EL_THRESHOLDS,
  SOLAR_THRESHOLDS,
} from "./thresholds";

// ── Types ──

export type OutcomeValue = "satisfactory" | "unsatisfactory" | "further_investigation";

export type OutcomeDetail = {
  rule: string;
  passed: boolean;
  message: string;
};

export type CertificateOutcome = {
  outcome: OutcomeValue;
  reason: string;
  details: OutcomeDetail[];
};

export type ObservationInput = {
  code: string;
  location?: string | null;
  description: string;
  resolvedAt?: string | Date | null;
};

export type ChecklistInput = {
  section: string;
  question: string;
  answer: string | null;
};

export type TestResultInput = {
  circuitRef?: string | null;
  data: Record<string, unknown>;
};

// ── Core engine ──

export function computeOutcome(
  type: string,
  observations: ObservationInput[],
  checklists: ChecklistInput[],
  testResults: TestResultInput[],
): CertificateOutcome {
  const category = getTypeCategory(type);
  if (!category) {
    return { outcome: "satisfactory", reason: "Unknown certificate type — no rules applied.", details: [] };
  }

  const details: OutcomeDetail[] = [];

  // Run category-specific rules
  switch (category) {
    case "electrical":
      runElectricalRules(observations, checklists, testResults, details);
      break;
    case "fire":
      runFireRules(observations, checklists, details);
      break;
    case "emergency_lighting":
      runEmergencyLightingRules(checklists, testResults, details);
      break;
    case "solar_pv":
      runSolarRules(checklists, testResults, details);
      break;
  }

  return resolveOutcome(details);
}

// ── Resolution ──

function resolveOutcome(details: OutcomeDetail[]): CertificateOutcome {
  const failures = details.filter((d) => !d.passed);
  const hasC3 = details.some((d) => d.rule === "obs.c3_present");
  if (failures.length === 0) {
    return {
      outcome: "satisfactory",
      reason: hasC3
        ? "Satisfactory with recommendations. Improvement observations noted."
        : "All checks passed. No defects identified.",
      details,
    };
  }

  const hasFI = failures.some((d) => d.rule.startsWith("obs.fi"));
  const hasHardFail = failures.some(
    (d) => d.rule.startsWith("obs.c1") || d.rule.startsWith("obs.c2") || d.rule.startsWith("checklist.fail") || d.rule.startsWith("test."),
  );

  if (hasHardFail) {
    const reasons = failures.map((d) => d.message);
    return {
      outcome: "unsatisfactory",
      reason: reasons.join(" "),
      details,
    };
  }

  if (hasFI) {
    const reasons = failures.map((d) => d.message);
    return {
      outcome: "further_investigation",
      reason: reasons.join(" "),
      details,
    };
  }

  // C3-only observations don't fail — satisfactory with recommendations
  return {
    outcome: "satisfactory",
    reason: "Satisfactory with recommendations. " + failures.map((d) => d.message).join(" "),
    details,
  };
}

// ── Electrical Rules ──

function runElectricalRules(
  observations: ObservationInput[],
  checklists: ChecklistInput[],
  testResults: TestResultInput[],
  details: OutcomeDetail[],
): void {
  runObservationRules(observations, details);
  runChecklistRules(checklists, details);
  runElectricalTestRules(testResults, details);
}

function runObservationRules(observations: ObservationInput[], details: OutcomeDetail[]): void {
  const unresolved = observations.filter((o) => !o.resolvedAt);
  const c1 = unresolved.filter((o) => o.code === "C1");
  const c2 = unresolved.filter((o) => o.code === "C2");
  const fi = unresolved.filter((o) => o.code === "FI");

  if (c1.length > 0) {
    details.push({
      rule: "obs.c1_present",
      passed: false,
      message: `${c1.length} x C1 (Danger present) observation${c1.length > 1 ? "s" : ""} recorded. Immediate remedial action required.`,
    });
  } else {
    details.push({ rule: "obs.c1_absent", passed: true, message: "No C1 observations." });
  }

  if (c2.length > 0) {
    details.push({
      rule: "obs.c2_present",
      passed: false,
      message: `${c2.length} x C2 (Potentially dangerous) observation${c2.length > 1 ? "s" : ""} recorded. Urgent remedial action required.`,
    });
  } else {
    details.push({ rule: "obs.c2_absent", passed: true, message: "No C2 observations." });
  }

  if (fi.length > 0) {
    details.push({
      rule: "obs.fi_present",
      passed: false,
      message: `${fi.length} x FI (Further Investigation) required.`,
    });
  }

  const c3 = unresolved.filter((o) => o.code === "C3");
  if (c3.length > 0) {
    details.push({
      rule: "obs.c3_present",
      passed: true,
      message: `${c3.length} x C3 (Improvement recommended) observation${c3.length > 1 ? "s" : ""} noted.`,
    });
  }
}

function runChecklistRules(checklists: ChecklistInput[], details: OutcomeDetail[]): void {
  const failed = checklists.filter((c) => c.answer === "fail");
  if (failed.length > 0) {
    details.push({
      rule: "checklist.fail_items",
      passed: false,
      message: `${failed.length} checklist item${failed.length > 1 ? "s" : ""} marked as fail.`,
    });
  } else if (checklists.length > 0) {
    details.push({ rule: "checklist.all_pass", passed: true, message: "All checklist items passed or N/A." });
  }
}

function runElectricalTestRules(testResults: TestResultInput[], details: OutcomeDetail[]): void {
  for (const tr of testResults) {
    const d = tr.data;
    const ref = tr.circuitRef || "unknown";

    // Zs check
    const zs = toNum(d.zs);
    const deviceType = String(d.deviceType || d.mcbType || "").toUpperCase();
    if (zs !== null && deviceType && ZS_MAX_TABLE[deviceType] !== undefined) {
      const max = ZS_MAX_TABLE[deviceType];
      if (zs > max) {
        details.push({
          rule: `test.zs_exceeded.${ref}`,
          passed: false,
          message: `Circuit ${ref}: Zs ${zs}Ω exceeds maximum ${max}Ω for ${deviceType}.`,
        });
      }
    }

    // IR check
    const ir = toNum(d.ir);
    if (ir !== null) {
      if (ir < IR_CRITICAL_MIN) {
        details.push({
          rule: `test.ir_critical.${ref}`,
          passed: false,
          message: `Circuit ${ref}: Insulation resistance ${ir}MΩ below critical minimum ${IR_CRITICAL_MIN}MΩ.`,
        });
      } else if (ir < IR_ADVISORY_MIN) {
        details.push({
          rule: `test.ir_advisory.${ref}`,
          passed: false,
          message: `Circuit ${ref}: Insulation resistance ${ir}MΩ below standard minimum ${IR_ADVISORY_MIN}MΩ.`,
        });
      }
    }

    // RCD check
    const rcdMs = toNum(d.rcdMs ?? d.rcd);
    if (rcdMs !== null && rcdMs > RCD_TRIP_MAX_MS["1xIn"]) {
      details.push({
        rule: `test.rcd_slow.${ref}`,
        passed: false,
        message: `Circuit ${ref}: RCD trip time ${rcdMs}ms exceeds maximum ${RCD_TRIP_MAX_MS["1xIn"]}ms.`,
      });
    }
  }
}

// ── Fire Rules ──

function runFireRules(
  observations: ObservationInput[],
  checklists: ChecklistInput[],
  details: OutcomeDetail[],
): void {
  // Fire uses same C-code logic for observations
  runObservationRules(observations, details);
  runChecklistRules(checklists, details);

  // Additional: detection coverage section
  const detCoverage = checklists.filter((c) => c.section === "detection_coverage");
  const detFails = detCoverage.filter((c) => c.answer === "fail");
  if (detFails.length > 0) {
    details.push({
      rule: "checklist.detection_coverage_fail",
      passed: false,
      message: `${detFails.length} detection coverage check${detFails.length > 1 ? "s" : ""} failed.`,
    });
  }
}

// ── Emergency Lighting Rules ──

function runEmergencyLightingRules(
  checklists: ChecklistInput[],
  testResults: TestResultInput[],
  details: OutcomeDetail[],
): void {
  runChecklistRules(checklists, details);

  for (const tr of testResults) {
    const d = tr.data;
    const ref = tr.circuitRef || "luminaire";

    // Duration test
    const duration = toNum(d.durationHours ?? d.duration);
    if (duration !== null && duration < EL_THRESHOLDS.minDurationHours) {
      details.push({
        rule: `test.el_duration_fail.${ref}`,
        passed: false,
        message: `${ref}: Duration ${duration}h below minimum ${EL_THRESHOLDS.minDurationHours}h.`,
      });
    }

    // Lux levels
    const lux = toNum(d.luxLevel ?? d.lux);
    if (lux !== null && lux < EL_THRESHOLDS.minLuxEscapeRoute) {
      details.push({
        rule: `test.el_lux_fail.${ref}`,
        passed: false,
        message: `${ref}: Lux level ${lux} below minimum ${EL_THRESHOLDS.minLuxEscapeRoute} lux.`,
      });
    }
  }
}

// ── Solar PV Rules ──

function runSolarRules(
  checklists: ChecklistInput[],
  testResults: TestResultInput[],
  details: OutcomeDetail[],
): void {
  runChecklistRules(checklists, details);

  for (const tr of testResults) {
    const d = tr.data;
    const ref = tr.circuitRef || "string";

    // Insulation resistance
    const ir = toNum(d.irMohm ?? d.ir);
    if (ir !== null && ir < SOLAR_THRESHOLDS.minIrMohm) {
      details.push({
        rule: `test.solar_ir_fail.${ref}`,
        passed: false,
        message: `${ref}: Insulation resistance ${ir}MΩ below minimum ${SOLAR_THRESHOLDS.minIrMohm}MΩ.`,
      });
    }

    // Earth continuity
    const earthR = toNum(d.earthContinuityOhm ?? d.earthR);
    if (earthR !== null && earthR > SOLAR_THRESHOLDS.maxEarthContinuityOhm) {
      details.push({
        rule: `test.solar_earth_fail.${ref}`,
        passed: false,
        message: `${ref}: Earth continuity ${earthR}Ω exceeds maximum ${SOLAR_THRESHOLDS.maxEarthContinuityOhm}Ω.`,
      });
    }

    // Voc deviation
    const voc = toNum(d.vocMeasured);
    const vocExpected = toNum(d.vocExpected);
    if (voc !== null && vocExpected !== null && vocExpected > 0) {
      const devPercent = Math.abs((voc - vocExpected) / vocExpected) * 100;
      if (devPercent > SOLAR_THRESHOLDS.maxVocDeviationPercent) {
        details.push({
          rule: `test.solar_voc_deviation.${ref}`,
          passed: false,
          message: `${ref}: Voc deviation ${devPercent.toFixed(1)}% exceeds ${SOLAR_THRESHOLDS.maxVocDeviationPercent}% threshold.`,
        });
      }
    }
  }
}

// ── Helpers ──

function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}
