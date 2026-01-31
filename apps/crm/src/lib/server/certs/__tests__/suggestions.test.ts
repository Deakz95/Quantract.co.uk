import { describe, it, expect } from "vitest";
import { suggestObservationCode } from "../suggestions";

describe("suggestObservationCode — Electrical", () => {
  it("suggests C1 when Zs significantly exceeds max for B16", () => {
    const result = suggestObservationCode("EICR", {
      field: "zs",
      value: 5.0, // max for B16 is 2.73, 1.5x = 4.095
      unit: "Ω",
      context: { deviceType: "B16" },
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("C1");
    expect(result!.regulation).toContain("411.3.3");
  });

  it("suggests C2 when Zs exceeds max but not 1.5x for B16", () => {
    const result = suggestObservationCode("EIC", {
      field: "zs",
      value: 3.0, // > 2.73 but < 4.095
      unit: "Ω",
      context: { deviceType: "B16" },
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("C2");
  });

  it("returns null when Zs within range for B16", () => {
    const result = suggestObservationCode("EICR", {
      field: "zs",
      value: 2.0,
      unit: "Ω",
      context: { deviceType: "B16" },
    });
    expect(result).toBeNull();
  });

  it("suggests C1 when IR below critical 0.5MΩ", () => {
    const result = suggestObservationCode("EICR", {
      field: "ir",
      value: 0.3,
      unit: "MΩ",
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("C1");
  });

  it("suggests C2 when IR between 0.5 and 1.0 MΩ", () => {
    const result = suggestObservationCode("EIC", {
      field: "ir",
      value: 0.7,
      unit: "MΩ",
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("C2");
  });

  it("returns null when IR >= 1.0 MΩ", () => {
    const result = suggestObservationCode("EICR", {
      field: "ir",
      value: 200,
      unit: "MΩ",
    });
    expect(result).toBeNull();
  });

  it("suggests C1 when RCD trip > 300ms", () => {
    const result = suggestObservationCode("EICR", {
      field: "rcd_ms",
      value: 400,
      unit: "ms",
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("C1");
  });

  it("suggests C3 for missing labels", () => {
    const result = suggestObservationCode("EICR", {
      field: "labels",
      value: 0,
      unit: "",
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("C3");
  });

  it("suggests C2 for missing bonding", () => {
    const result = suggestObservationCode("EIC", {
      field: "bonding",
      value: 0,
      unit: "",
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("C2");
  });
});

describe("suggestObservationCode — Emergency Lighting", () => {
  it("suggests Critical for low duration", () => {
    const result = suggestObservationCode("EL_COMPLETION", {
      field: "duration_hours",
      value: 2.0,
      unit: "hours",
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("Critical");
  });

  it("suggests Critical for low lux", () => {
    const result = suggestObservationCode("EL_PERIODIC", {
      field: "lux",
      value: 0.4,
      unit: "lux",
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("Critical");
  });
});

describe("suggestObservationCode — Solar PV", () => {
  it("suggests Critical for low IR", () => {
    const result = suggestObservationCode("SOLAR_TEST_REPORT", {
      field: "ir_mohm",
      value: 0.5,
      unit: "MΩ",
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("Critical");
  });

  it("suggests Critical for high earth continuity", () => {
    const result = suggestObservationCode("SOLAR_INSTALLATION", {
      field: "earth_continuity",
      value: 2.0,
      unit: "Ω",
    });
    expect(result).not.toBeNull();
    expect(result!.code).toBe("Critical");
  });

  it("returns null for unknown type", () => {
    const result = suggestObservationCode("UNKNOWN", {
      field: "ir",
      value: 0.1,
      unit: "MΩ",
    });
    expect(result).toBeNull();
  });
});
