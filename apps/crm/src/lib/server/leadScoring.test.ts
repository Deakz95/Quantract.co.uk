import { describe, it, expect } from "vitest";
import { scoreEnquiry, DEFAULT_CONFIG, type LeadScoringConfigData } from "./leadScoring";

describe("scoreEnquiry", () => {
  it("scores an enquiry with matching keywords", () => {
    const result = scoreEnquiry(
      { name: "John", message: "I need an emergency rewire for my house" },
      DEFAULT_CONFIG,
    );
    expect(result.score).toBeGreaterThan(0);
    expect(result.reason.keywords.length).toBeGreaterThan(0);
    expect(result.reason.keywords.some((k) => k.keyword === "emergency")).toBe(true);
    expect(result.reason.keywords.some((k) => k.keyword === "rewire")).toBe(true);
    expect(result.priority).toBe("urgent"); // emergency(20) + rewire(10) = 30 >= urgent threshold
  });

  it("returns low priority for empty enquiry", () => {
    const result = scoreEnquiry({ name: "Bob" }, DEFAULT_CONFIG);
    expect(result.score).toBe(0);
    expect(result.priority).toBe("low");
    expect(result.reason.keywords).toEqual([]);
  });

  it("applies phone number boost", () => {
    const result = scoreEnquiry(
      { name: "Jane", phone: "07123456789" },
      DEFAULT_CONFIG,
    );
    expect(result.reason.boosts.some((b) => b.rule === "has phone number")).toBe(true);
    expect(result.score).toBe(3);
  });

  it("applies value estimate boost", () => {
    const result = scoreEnquiry(
      { name: "Client", valueEstimate: 6000 },
      DEFAULT_CONFIG,
    );
    expect(result.reason.boosts.some((b) => b.rule.includes("value estimate"))).toBe(true);
    expect(result.score).toBe(10); // >= 5000
  });

  it("uses custom config", () => {
    const config: LeadScoringConfigData = {
      keywords: [{ keyword: "solar panel", points: 50 }],
      priorityThresholds: { high: 20, urgent: 40 },
    };
    const result = scoreEnquiry(
      { message: "I want solar panel installation" },
      config,
    );
    expect(result.score).toBe(50);
    expect(result.priority).toBe("urgent");
    expect(result.reason.keywords[0].keyword).toBe("solar panel");
  });

  it("handles boost rules", () => {
    const config: LeadScoringConfigData = {
      keywords: [],
      priorityThresholds: { high: 5, urgent: 20 },
      boostRules: [
        { field: "source", condition: "equals", value: "website", points: 10 },
      ],
    };
    const result = scoreEnquiry({ source: "website" }, config);
    expect(result.reason.boosts.some((b) => b.rule.includes("source"))).toBe(true);
    expect(result.score).toBe(10);
    expect(result.priority).toBe("high");
  });

  it("'smell burning' scores urgent with appropriate config", () => {
    const config: LeadScoringConfigData = {
      keywords: [
        { keyword: "smell burning", points: 60 },
        { keyword: "no power", points: 30 },
      ],
      priorityThresholds: { high: 30, urgent: 60 },
    };
    const result = scoreEnquiry(
      { message: "I can smell burning from my fuse board" },
      config,
    );
    expect(result.score).toBe(60);
    expect(result.priority).toBe("urgent");
    expect(result.reason.keywords[0].keyword).toBe("smell burning");
  });

  it("'eicr' scores normal but >0 with default config", () => {
    const result = scoreEnquiry(
      { message: "I need an eicr certificate for my rental property" },
      DEFAULT_CONFIG,
    );
    expect(result.score).toBeGreaterThan(0);
    // eicr(5) + certificate(4) = 9 < high(15), so normal
    expect(result.priority).toBe("normal");
    expect(result.reason.keywords.some((k) => k.keyword === "eicr")).toBe(true);
  });

  it("deterministic: same input always produces same score", () => {
    const input = { name: "Test", message: "urgent rewire needed asap" };
    const r1 = scoreEnquiry(input, DEFAULT_CONFIG);
    const r2 = scoreEnquiry(input, DEFAULT_CONFIG);
    expect(r1.score).toBe(r2.score);
    expect(r1.priority).toBe(r2.priority);
    expect(r1.reason.keywords).toEqual(r2.reason.keywords);
  });
});
