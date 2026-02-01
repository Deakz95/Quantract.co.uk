import { describe, expect, it } from "vitest";
import { calcTotals } from "./calcTotals";

describe("calcTotals", () => {
  it("basic: 2 x £100 at 20% VAT", () => {
    const r = calcTotals([{ qty: 2, unitPrice: 100 }], 0.2);
    expect(r.subtotal).toBe(200);
    expect(r.vat).toBe(40);
    expect(r.total).toBe(240);
    expect(r.vatRate).toBe(0.2);
    expect(r.lineTotals).toEqual([200]);
  });

  it("multiple items", () => {
    const r = calcTotals(
      [
        { qty: 1, unitPrice: 50 },
        { qty: 3, unitPrice: 25 },
      ],
      0.2,
    );
    expect(r.subtotal).toBe(125);
    expect(r.vat).toBe(25);
    expect(r.total).toBe(150);
    expect(r.lineTotals).toEqual([50, 75]);
  });

  it("rounding: 3 x £19.99 at 20%", () => {
    const r = calcTotals([{ qty: 3, unitPrice: 19.99 }], 0.2);
    expect(r.subtotal).toBe(59.97);
    expect(r.vat).toBe(11.99); // 59.97 * 0.2 = 11.994 → 11.99
    expect(r.total).toBe(71.96);
  });

  it("rounding: 7 x £13.33 at 20%", () => {
    const r = calcTotals([{ qty: 7, unitPrice: 13.33 }], 0.2);
    // 7 * 13.33 = 93.31
    expect(r.subtotal).toBe(93.31);
    expect(r.vat).toBe(18.66); // 93.31 * 0.2 = 18.662 → 18.66
    expect(r.total).toBe(111.97);
  });

  it("zero-rated VAT", () => {
    const r = calcTotals([{ qty: 5, unitPrice: 10 }], 0);
    expect(r.subtotal).toBe(50);
    expect(r.vat).toBe(0);
    expect(r.total).toBe(50);
  });

  it("defaults vatRate to 0.2 when not provided", () => {
    const r = calcTotals([{ qty: 1, unitPrice: 100 }]);
    expect(r.vatRate).toBe(0.2);
    expect(r.vat).toBe(20);
    expect(r.total).toBe(120);
  });

  it("empty items → zero totals", () => {
    const r = calcTotals([], 0.2);
    expect(r.subtotal).toBe(0);
    expect(r.vat).toBe(0);
    expect(r.total).toBe(0);
    expect(r.lineTotals).toEqual([]);
  });

  it("handles NaN/undefined gracefully", () => {
    const r = calcTotals(
      [{ qty: NaN, unitPrice: 100 }, { qty: 2, unitPrice: NaN }],
      0.2,
    );
    expect(r.subtotal).toBe(0);
    expect(r.vat).toBe(0);
    expect(r.total).toBe(0);
  });

  it("handles invalid vatRate", () => {
    const r = calcTotals([{ qty: 1, unitPrice: 100 }], NaN);
    expect(r.vatRate).toBe(0.2); // falls back to default
    expect(r.vat).toBe(20);
  });

  it("invariant: total = subtotal + vat always holds", () => {
    // Fuzz with tricky decimal values
    const cases = [
      { qty: 1, unitPrice: 0.01 },
      { qty: 99, unitPrice: 9.99 },
      { qty: 7, unitPrice: 33.33 },
      { qty: 13, unitPrice: 7.77 },
    ];
    for (const item of cases) {
      const r = calcTotals([item], 0.2);
      // total must equal subtotal + vat within 1p (rounding)
      expect(Math.abs(r.total - (r.subtotal + r.vat))).toBeLessThanOrEqual(0.01);
    }
  });

  it("pence-safe: no floating-point accumulation drift", () => {
    // 100 items of £0.01 should be exactly £1.00 not £0.9999...
    const items = Array.from({ length: 100 }, () => ({ qty: 1, unitPrice: 0.01 }));
    const r = calcTotals(items, 0.2);
    expect(r.subtotal).toBe(1.0);
    expect(r.vat).toBe(0.2);
    expect(r.total).toBe(1.2);
  });
});
