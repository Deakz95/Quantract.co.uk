import { describe, it, expect } from "vitest";
import { computeOutcome, type ObservationInput, type ChecklistInput, type TestResultInput } from "../rules";

const noObs: ObservationInput[] = [];
const noChecklist: ChecklistInput[] = [];
const noTests: TestResultInput[] = [];

// ── Electrical ──

describe("computeOutcome — Electrical", () => {
  it("returns satisfactory when no observations, all checklists pass", () => {
    const checklists: ChecklistInput[] = [
      { section: "visual_inspection", question: "Labels present", answer: "pass" },
      { section: "testing", question: "IR test", answer: "pass" },
    ];
    const result = computeOutcome("EICR", noObs, checklists, noTests);
    expect(result.outcome).toBe("satisfactory");
  });

  it("returns unsatisfactory when C1 observation present", () => {
    const obs: ObservationInput[] = [
      { code: "C1", description: "Exposed live parts accessible", location: "DB1" },
    ];
    const result = computeOutcome("EICR", obs, noChecklist, noTests);
    expect(result.outcome).toBe("unsatisfactory");
    expect(result.details.some((d) => d.rule === "obs.c1_present")).toBe(true);
  });

  it("returns unsatisfactory when C2 observation present", () => {
    const obs: ObservationInput[] = [
      { code: "C2", description: "Missing bonding", location: "Kitchen" },
    ];
    const result = computeOutcome("EIC", obs, noChecklist, noTests);
    expect(result.outcome).toBe("unsatisfactory");
    expect(result.details.some((d) => d.rule === "obs.c2_present")).toBe(true);
  });

  it("returns satisfactory when only C3 observations present", () => {
    const obs: ObservationInput[] = [
      { code: "C3", description: "Labels missing on DB" },
    ];
    const result = computeOutcome("EICR", obs, noChecklist, noTests);
    expect(result.outcome).toBe("satisfactory");
    expect(result.reason).toContain("recommendations");
  });

  it("returns further_investigation when only FI present", () => {
    const obs: ObservationInput[] = [
      { code: "FI", description: "Unable to access junction box" },
    ];
    const result = computeOutcome("EICR", obs, noChecklist, noTests);
    expect(result.outcome).toBe("further_investigation");
  });

  it("returns unsatisfactory for mixed C2 + C3 (worst wins)", () => {
    const obs: ObservationInput[] = [
      { code: "C2", description: "Potentially dangerous" },
      { code: "C3", description: "Improvement recommended" },
    ];
    const result = computeOutcome("EICR", obs, noChecklist, noTests);
    expect(result.outcome).toBe("unsatisfactory");
  });

  it("returns unsatisfactory when checklist item is fail", () => {
    const checklists: ChecklistInput[] = [
      { section: "testing", question: "IR test", answer: "fail" },
    ];
    const result = computeOutcome("EIC", noObs, checklists, noTests);
    expect(result.outcome).toBe("unsatisfactory");
  });

  it("ignores resolved observations", () => {
    const obs: ObservationInput[] = [
      { code: "C1", description: "Was dangerous", resolvedAt: new Date().toISOString() },
    ];
    const result = computeOutcome("EICR", obs, noChecklist, noTests);
    expect(result.outcome).toBe("satisfactory");
  });

  it("returns unsatisfactory when Zs exceeds maximum for device type", () => {
    const tests: TestResultInput[] = [
      { circuitRef: "C1", data: { zs: 5.0, deviceType: "B16" } }, // max is 2.73
    ];
    const result = computeOutcome("EIC", noObs, noChecklist, tests);
    expect(result.outcome).toBe("unsatisfactory");
    expect(result.details.some((d) => d.rule.startsWith("test.zs_exceeded"))).toBe(true);
  });

  it("returns unsatisfactory when IR below critical minimum", () => {
    const tests: TestResultInput[] = [
      { circuitRef: "C2", data: { ir: 0.3 } },
    ];
    const result = computeOutcome("EICR", noObs, noChecklist, tests);
    expect(result.outcome).toBe("unsatisfactory");
    expect(result.details.some((d) => d.rule.startsWith("test.ir_critical"))).toBe(true);
  });

  it("returns unsatisfactory when RCD trip exceeds 300ms", () => {
    const tests: TestResultInput[] = [
      { circuitRef: "C3", data: { rcdMs: 400 } },
    ];
    const result = computeOutcome("MWC", noObs, noChecklist, tests);
    expect(result.outcome).toBe("unsatisfactory");
    expect(result.details.some((d) => d.rule.startsWith("test.rcd_slow"))).toBe(true);
  });

  it("returns satisfactory with valid test results", () => {
    const tests: TestResultInput[] = [
      { circuitRef: "C1", data: { zs: 1.5, deviceType: "B16", ir: 200, rcdMs: 25 } },
    ];
    const result = computeOutcome("EIC", noObs, noChecklist, tests);
    expect(result.outcome).toBe("satisfactory");
  });
});

// ── Fire ──

describe("computeOutcome — Fire", () => {
  it("returns satisfactory when all pass", () => {
    const checklists: ChecklistInput[] = [
      { section: "detection_coverage", question: "Full coverage", answer: "pass" },
    ];
    const result = computeOutcome("FIRE_COMMISSIONING", noObs, checklists, noTests);
    expect(result.outcome).toBe("satisfactory");
  });

  it("returns unsatisfactory when detection coverage fails", () => {
    const checklists: ChecklistInput[] = [
      { section: "detection_coverage", question: "Full coverage", answer: "fail" },
    ];
    const result = computeOutcome("FIRE_COMMISSIONING", noObs, checklists, noTests);
    expect(result.outcome).toBe("unsatisfactory");
  });

  it("returns unsatisfactory with C1 observation on fire cert", () => {
    const obs: ObservationInput[] = [
      { code: "C1", description: "Panel non-functional" },
    ];
    const result = computeOutcome("FIRE_INSPECTION_SERVICING", obs, noChecklist, noTests);
    expect(result.outcome).toBe("unsatisfactory");
  });
});

// ── Emergency Lighting ──

describe("computeOutcome — Emergency Lighting", () => {
  it("returns unsatisfactory when duration below minimum", () => {
    const tests: TestResultInput[] = [
      { circuitRef: "LUM-1", data: { durationHours: 2.5 } }, // min 3h
    ];
    const result = computeOutcome("EL_COMPLETION", noObs, noChecklist, tests);
    expect(result.outcome).toBe("unsatisfactory");
  });

  it("returns unsatisfactory when lux below minimum", () => {
    const tests: TestResultInput[] = [
      { circuitRef: "LUM-2", data: { luxLevel: 0.4 } }, // min 1.0
    ];
    const result = computeOutcome("EL_PERIODIC", noObs, noChecklist, tests);
    expect(result.outcome).toBe("unsatisfactory");
  });

  it("returns satisfactory when all within range", () => {
    const tests: TestResultInput[] = [
      { circuitRef: "LUM-1", data: { durationHours: 3.5, luxLevel: 2.0 } },
    ];
    const result = computeOutcome("EL_COMPLETION", noObs, noChecklist, tests);
    expect(result.outcome).toBe("satisfactory");
  });
});

// ── Solar PV ──

describe("computeOutcome — Solar PV", () => {
  it("returns unsatisfactory when IR below threshold", () => {
    const tests: TestResultInput[] = [
      { circuitRef: "String1", data: { irMohm: 0.5 } }, // min 1.0
    ];
    const result = computeOutcome("SOLAR_TEST_REPORT", noObs, noChecklist, tests);
    expect(result.outcome).toBe("unsatisfactory");
  });

  it("returns unsatisfactory when earth continuity too high", () => {
    const tests: TestResultInput[] = [
      { circuitRef: "String1", data: { earthContinuityOhm: 1.5 } }, // max 1.0
    ];
    const result = computeOutcome("SOLAR_INSTALLATION", noObs, noChecklist, tests);
    expect(result.outcome).toBe("unsatisfactory");
  });

  it("returns unsatisfactory when Voc deviation exceeds threshold", () => {
    const tests: TestResultInput[] = [
      { circuitRef: "String1", data: { vocMeasured: 350, vocExpected: 400 } }, // 12.5% deviation > 10%
    ];
    const result = computeOutcome("SOLAR_TEST_REPORT", noObs, noChecklist, tests);
    expect(result.outcome).toBe("unsatisfactory");
  });

  it("returns satisfactory when all within range", () => {
    const tests: TestResultInput[] = [
      { circuitRef: "String1", data: { irMohm: 5.0, earthContinuityOhm: 0.3, vocMeasured: 395, vocExpected: 400 } },
    ];
    const result = computeOutcome("SOLAR_INSTALLATION", noObs, noChecklist, tests);
    expect(result.outcome).toBe("satisfactory");
  });
});

// ── Unknown type ──

describe("computeOutcome — Unknown type", () => {
  it("returns satisfactory for unknown type with no rules", () => {
    const result = computeOutcome("UNKNOWN_TYPE", noObs, noChecklist, noTests);
    expect(result.outcome).toBe("satisfactory");
  });
});
