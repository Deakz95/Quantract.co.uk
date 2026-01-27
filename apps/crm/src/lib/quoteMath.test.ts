/**
 * Tests for quoteMath utility functions
 */
import { describe, expect, it } from "vitest";
import {
  clampMoney,
  lineTotal,
  subtotal,
  vatAmount,
  grandTotal,
  type QuoteLine,
} from "./quoteMath";

describe("quoteMath", () => {
  describe("clampMoney", () => {
    it("should round to 2 decimal places", () => {
      expect(clampMoney(10.005)).toBe(10.01);
      expect(clampMoney(10.004)).toBe(10);
      expect(clampMoney(10.999)).toBe(11);
    });

    it("should handle integers", () => {
      expect(clampMoney(100)).toBe(100);
      expect(clampMoney(0)).toBe(0);
    });

    it("should return 0 for NaN", () => {
      expect(clampMoney(NaN)).toBe(0);
    });

    it("should return 0 for Infinity", () => {
      expect(clampMoney(Infinity)).toBe(0);
      expect(clampMoney(-Infinity)).toBe(0);
    });

    it("should handle negative numbers", () => {
      // Math.round(-10.005 * 100) = -1001, so / 100 = -10.01
      expect(clampMoney(-10.005)).toBe(-10.01);
      expect(clampMoney(-10.006)).toBe(-10.01);
    });

    it("should handle very small numbers", () => {
      expect(clampMoney(0.001)).toBe(0);
      expect(clampMoney(0.009)).toBe(0.01);
    });
  });

  describe("lineTotal", () => {
    it("should calculate qty * rate", () => {
      const line: QuoteLine = { id: "1", description: "Item", qty: 2, unit: "each", rate: 50 };
      expect(lineTotal(line)).toBe(100);
    });

    it("should handle decimal quantities", () => {
      const line: QuoteLine = { id: "1", description: "Item", qty: 1.5, unit: "hours", rate: 100 };
      expect(lineTotal(line)).toBe(150);
    });

    it("should handle decimal rates", () => {
      const line: QuoteLine = { id: "1", description: "Item", qty: 3, unit: "each", rate: 33.33 };
      expect(lineTotal(line)).toBe(99.99);
    });

    it("should handle zero quantity", () => {
      const line: QuoteLine = { id: "1", description: "Item", qty: 0, unit: "each", rate: 100 };
      expect(lineTotal(line)).toBe(0);
    });

    it("should handle zero rate", () => {
      const line: QuoteLine = { id: "1", description: "Item", qty: 10, unit: "each", rate: 0 };
      expect(lineTotal(line)).toBe(0);
    });

    it("should handle undefined qty as 0", () => {
      const line = { id: "1", description: "Item", unit: "each", rate: 100 } as QuoteLine;
      expect(lineTotal(line)).toBe(0);
    });

    it("should handle undefined rate as 0", () => {
      const line = { id: "1", description: "Item", qty: 10, unit: "each" } as QuoteLine;
      expect(lineTotal(line)).toBe(0);
    });

    it("should clamp result to 2 decimal places", () => {
      const line: QuoteLine = { id: "1", description: "Item", qty: 3, unit: "each", rate: 33.333 };
      expect(lineTotal(line)).toBe(100); // 3 * 33.333 = 99.999 -> 100
    });
  });

  describe("subtotal", () => {
    it("should sum all line totals", () => {
      const lines: QuoteLine[] = [
        { id: "1", description: "Item 1", qty: 1, unit: "each", rate: 100 },
        { id: "2", description: "Item 2", qty: 2, unit: "each", rate: 50 },
      ];
      expect(subtotal(lines)).toBe(200);
    });

    it("should handle empty array", () => {
      expect(subtotal([])).toBe(0);
    });

    it("should handle single line", () => {
      const lines: QuoteLine[] = [
        { id: "1", description: "Item", qty: 5, unit: "each", rate: 20 },
      ];
      expect(subtotal(lines)).toBe(100);
    });

    it("should clamp final result", () => {
      const lines: QuoteLine[] = [
        { id: "1", description: "Item 1", qty: 1, unit: "each", rate: 33.33 },
        { id: "2", description: "Item 2", qty: 1, unit: "each", rate: 33.33 },
        { id: "3", description: "Item 3", qty: 1, unit: "each", rate: 33.33 },
      ];
      expect(subtotal(lines)).toBe(99.99);
    });

    it("should handle many lines", () => {
      const lines: QuoteLine[] = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        description: `Item ${i}`,
        qty: 1,
        unit: "each",
        rate: 10,
      }));
      expect(subtotal(lines)).toBe(1000);
    });
  });

  describe("vatAmount", () => {
    it("should calculate 20% VAT", () => {
      expect(vatAmount(100, 0.2)).toBe(20);
    });

    it("should calculate 5% VAT", () => {
      expect(vatAmount(100, 0.05)).toBe(5);
    });

    it("should calculate 0% VAT", () => {
      expect(vatAmount(100, 0)).toBe(0);
    });

    it("should handle decimal subtotals", () => {
      expect(vatAmount(123.45, 0.2)).toBe(24.69);
    });

    it("should clamp result", () => {
      expect(vatAmount(33.33, 0.2)).toBe(6.67);
    });

    it("should handle zero subtotal", () => {
      expect(vatAmount(0, 0.2)).toBe(0);
    });
  });

  describe("grandTotal", () => {
    it("should add subtotal and VAT", () => {
      expect(grandTotal(100, 20)).toBe(120);
    });

    it("should handle zero VAT", () => {
      expect(grandTotal(100, 0)).toBe(100);
    });

    it("should handle decimal values", () => {
      expect(grandTotal(123.45, 24.69)).toBe(148.14);
    });

    it("should clamp result", () => {
      expect(grandTotal(33.33, 6.666)).toBe(40);
    });

    it("should handle zero subtotal", () => {
      expect(grandTotal(0, 0)).toBe(0);
    });
  });

  describe("Full calculation flow", () => {
    it("should calculate complete quote correctly", () => {
      const lines: QuoteLine[] = [
        { id: "1", description: "Labour", qty: 8, unit: "hours", rate: 50 },
        { id: "2", description: "Materials", qty: 1, unit: "lot", rate: 200 },
      ];

      const sub = subtotal(lines); // 400 + 200 = 600
      const vat = vatAmount(sub, 0.2); // 120
      const total = grandTotal(sub, vat); // 720

      expect(sub).toBe(600);
      expect(vat).toBe(120);
      expect(total).toBe(720);
    });

    it("should handle complex real-world quote", () => {
      const lines: QuoteLine[] = [
        { id: "1", description: "Consumer unit", qty: 1, unit: "each", rate: 185.99 },
        { id: "2", description: "MCBs", qty: 12, unit: "each", rate: 8.50 },
        { id: "3", description: "Cable 2.5mm", qty: 50, unit: "m", rate: 1.20 },
        { id: "4", description: "Labour", qty: 6.5, unit: "hours", rate: 55 },
      ];

      const sub = subtotal(lines);
      const vat = vatAmount(sub, 0.2);
      const total = grandTotal(sub, vat);

      expect(sub).toBe(705.49); // 185.99 + 102 + 60 + 357.5
      expect(vat).toBe(141.1); // 705.49 * 0.2
      expect(total).toBe(846.59);
    });
  });
});
