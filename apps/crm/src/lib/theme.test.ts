/**
 * Tests for theme brand config
 */
import { describe, expect, it } from "vitest";
import { brand } from "./theme";

describe("theme", () => {
  describe("brand", () => {
    it("should export brand name", () => {
      expect(brand.name).toBe("Quantract");
    });

    it("should export accent text class", () => {
      expect(brand.accent).toBe("text-indigo-600");
    });

    it("should export accent background class", () => {
      expect(brand.accentBg).toBe("bg-indigo-600");
    });

    it("should have all required properties", () => {
      expect(brand).toHaveProperty("name");
      expect(brand).toHaveProperty("accent");
      expect(brand).toHaveProperty("accentBg");
    });
  });
});
