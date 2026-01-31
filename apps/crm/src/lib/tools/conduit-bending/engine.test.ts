import { describe, it, expect } from "vitest";
import { calculateConduitBending } from "./engine";

describe("calculateConduitBending", () => {
  describe("offset bend", () => {
    it("calculates 30 offset correctly", () => {
      const result = calculateConduitBending({
        bendType: "offset",
        offsetHeight: 50,
        bendAngle: 30,
        conduitDiameter: 20,
      });
      // spacing = 50 / sin(30) = 50 / 0.5 = 100mm
      expect(result.markSpacing).toBeCloseTo(100, 0);
      // shrinkage = 50 / tan(30) = 50 / 0.577 = 86.6mm
      expect(result.shrinkage).toBeCloseTo(86.6, 0);
      expect(result.angleUsed).toBe(30);
    });

    it("calculates 45 offset correctly", () => {
      const result = calculateConduitBending({
        bendType: "offset",
        offsetHeight: 100,
        bendAngle: 45,
        conduitDiameter: 25,
      });
      // spacing = 100 / sin(45) = 100 / 0.707 = 141.4mm
      expect(result.markSpacing).toBeCloseTo(141.4, 0);
      // shrinkage = 100 / tan(45) = 100mm
      expect(result.shrinkage).toBeCloseTo(100, 0);
    });

    it("defaults to 30 when no angle specified", () => {
      const result = calculateConduitBending({
        bendType: "offset",
        offsetHeight: 50,
        conduitDiameter: 20,
      });
      expect(result.angleUsed).toBe(30);
    });

    it("returns steps array", () => {
      const result = calculateConduitBending({
        bendType: "offset",
        offsetHeight: 50,
        bendAngle: 30,
        conduitDiameter: 20,
      });
      expect(result.steps.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("saddle bend", () => {
    it("calculates 45 saddle correctly", () => {
      const result = calculateConduitBending({
        bendType: "saddle",
        offsetHeight: 30,
        bendAngle: 45,
        conduitDiameter: 20,
      });
      // Outer marks at 2.5 x 30 = 75mm from center
      expect(result.markSpacing).toBeCloseTo(75, 0);
      expect(result.angleUsed).toBe(45);
    });

    it("uses different multiplier for 30 center", () => {
      const result = calculateConduitBending({
        bendType: "saddle",
        offsetHeight: 30,
        bendAngle: 30,
        conduitDiameter: 20,
      });
      // Outer marks at 5 x 30 = 150mm from center
      expect(result.markSpacing).toBeCloseTo(150, 0);
    });
  });

  describe("90 bend", () => {
    it("returns take-up for 20mm conduit", () => {
      const result = calculateConduitBending({
        bendType: "ninety",
        conduitDiameter: 20,
      });
      expect(result.angleUsed).toBe(90);
      expect(result.gain).toBeDefined();
      expect(result.steps.length).toBeGreaterThanOrEqual(4);
    });

    it("returns take-up for 25mm conduit", () => {
      const result = calculateConduitBending({
        bendType: "ninety",
        conduitDiameter: 25,
      });
      expect(result.description).toContain("25mm");
    });

    it("handles non-standard conduit size", () => {
      const result = calculateConduitBending({
        bendType: "ninety",
        conduitDiameter: 63,
      });
      expect(result.gain).toBeDefined();
      expect(result.gain).toBeGreaterThan(0);
    });
  });
});

