// src/lib/invoiceMath.test.ts
import { describe, expect, it } from "vitest";
import {
  percentOf,
  remainingBalance,
  clampMoney,
  calculateVATFromSubtotal,
  calculateSubtotalFromTotal,
  calculateZeroRatedVAT,
  validateVATCalculation,
  type VATCalculation,
} from "./invoiceMath";

describe("invoiceMath", () => {
  it("calculates percent", () => {
    expect(percentOf(1000, 30)).toBe(300);
    expect(percentOf(999.99, 10)).toBe(100);
  });

  it("clamps money", () => {
    expect(clampMoney(10.005)).toBe(10.01);
    expect(clampMoney(Number.NaN)).toBe(0);
  });

  it("remaining balance", () => {
    expect(remainingBalance(1000, 300)).toBe(700);
    expect(remainingBalance(1000, 2000)).toBe(0);
  });
});

describe("invoiceMath - VAT Calculations", () => {
  describe("calculateVATFromSubtotal - VAT-exclusive", () => {
    it("calculates 20% VAT correctly", () => {
      const result = calculateVATFromSubtotal(100, 0.2);
      expect(result.subtotal).toBe(100);
      expect(result.vat).toBe(20);
      expect(result.total).toBe(120);
      expect(result.vatRate).toBe(0.2);
    });

    it("calculates 0% VAT correctly", () => {
      const result = calculateVATFromSubtotal(100, 0);
      expect(result.subtotal).toBe(100);
      expect(result.vat).toBe(0);
      expect(result.total).toBe(100);
    });

    it("handles decimal subtotals with proper rounding", () => {
      const result = calculateVATFromSubtotal(123.45, 0.2);
      expect(result.subtotal).toBe(123.45);
      expect(result.vat).toBe(24.69);
      expect(result.total).toBe(148.14);
    });
  });

  describe("calculateSubtotalFromTotal - VAT-inclusive", () => {
    it("calculates subtotal from 20% VAT-inclusive total", () => {
      const result = calculateSubtotalFromTotal(120, 0.2);
      expect(result.subtotal).toBe(100);
      expect(result.vat).toBe(20);
      expect(result.total).toBe(120);
    });

    it("calculates subtotal from 0% VAT-inclusive total", () => {
      const result = calculateSubtotalFromTotal(100, 0);
      expect(result.subtotal).toBe(100);
      expect(result.vat).toBe(0);
      expect(result.total).toBe(100);
    });
  });

  describe("calculateZeroRatedVAT", () => {
    it("calculates zero VAT correctly", () => {
      const result = calculateZeroRatedVAT(100);
      expect(result.subtotal).toBe(100);
      expect(result.vat).toBe(0);
      expect(result.total).toBe(100);
      expect(result.vatRate).toBe(0);
    });
  });

  describe("validateVATCalculation", () => {
    it("validates correct VAT calculations", () => {
      const valid: VATCalculation = {
        subtotal: 100,
        vat: 20,
        total: 120,
        vatRate: 0.2,
      };
      expect(validateVATCalculation(valid)).toBe(true);
    });

    it("rejects invalid VAT calculations", () => {
      const invalid: VATCalculation = {
        subtotal: 100,
        vat: 20,
        total: 125, // Should be 120
        vatRate: 0.2,
      };
      expect(validateVATCalculation(invalid)).toBe(false);
    });

    it("accepts calculations within rounding tolerance", () => {
      // 123.46 + 24.69 = 148.15 (exact sum)
      // Test with 148.15 which is within tolerance
      const withinTolerance: VATCalculation = {
        subtotal: 123.46,
        vat: 24.69,
        total: 148.15,
        vatRate: 0.2,
      };
      expect(validateVATCalculation(withinTolerance)).toBe(true);
    });
  });

  describe("VAT calculation consistency", () => {
    it("exclusive -> inclusive -> exclusive produces same result", () => {
      const original = calculateVATFromSubtotal(100, 0.2);
      const reversed = calculateSubtotalFromTotal(original.total, 0.2);
      expect(reversed.subtotal).toBe(original.subtotal);
      expect(reversed.vat).toBe(original.vat);
    });

    it("inclusive -> exclusive -> inclusive produces same result", () => {
      const original = calculateSubtotalFromTotal(120, 0.2);
      const reversed = calculateVATFromSubtotal(original.subtotal, 0.2);
      expect(reversed.subtotal).toBe(original.subtotal);
      expect(reversed.vat).toBe(original.vat);
    });
  });
});
