import { describe, it, expect } from "vitest";
import { calculateUgr } from "./engine";
import { ugrInputSchema } from "./schema";

const base = {
  roomLength: 8, roomWidth: 6, luminaireHeight: 2.2,
  luminaireLumens: 5000, numberOfLuminaires: 12,
  luminaireArea: 0.12, backgroundLuminance: 20,
};

describe("calculateUgr", () => {
  it("returns a numeric UGR value", () => {
    const r = calculateUgr(base);
    expect(typeof r.ugr).toBe("number");
    expect(r.ugr).not.toBeNaN();
  });

  it("rates low UGR as acceptable", () => {
    const r = calculateUgr({ ...base, luminaireLumens: 500, numberOfLuminaires: 2, luminaireArea: 0.36 });
    expect(r.ugr).toBeLessThan(19);
    expect(r.rating).toBe("acceptable");
  });

  it("increases UGR with more luminaires", () => {
    const r1 = calculateUgr({ ...base, numberOfLuminaires: 4 });
    const r2 = calculateUgr({ ...base, numberOfLuminaires: 24 });
    expect(r2.ugr).toBeGreaterThan(r1.ugr);
  });

  it("decreases UGR with larger luminaire area", () => {
    const r1 = calculateUgr({ ...base, luminaireArea: 0.06 });
    const r2 = calculateUgr({ ...base, luminaireArea: 0.36 });
    expect(r2.ugr).toBeLessThan(r1.ugr);
  });

  it("flags excessive glare for high-output small luminaires", () => {
    const r = calculateUgr({
      ...base, luminaireLumens: 20000,
      luminaireArea: 0.04, numberOfLuminaires: 24,
    });
    expect(r.ugr).toBeGreaterThan(25);
    expect(r.rating).toBe("excessive");
  });

  it("includes task limit thresholds in output", () => {
    const r = calculateUgr(base);
    expect(r.taskLimits.office).toBe(19);
    expect(r.taskLimits.industrial).toBe(22);
    expect(r.taskLimits.corridor).toBe(25);
  });
});

describe("ugrInputSchema", () => {
  it("applies defaults", () => {
    const p = ugrInputSchema.parse({
      roomLength: 10, roomWidth: 8, luminaireHeight: 2.5,
    });
    expect(p.backgroundLuminance).toBe(20);
    expect(p.luminaireArea).toBe(0.12);
  });
});
