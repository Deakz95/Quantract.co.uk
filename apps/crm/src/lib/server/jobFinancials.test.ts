import { describe, it, expect } from "vitest";
import {
  calculateCostItemTotal,
  calculateBudgetSubtotal,
  calculateActualCost,
  calculateForecastCost,
  calculateMargin,
  calculateMarginPercentage,
  calculateJobFinancials,
  type CostItemInput,
  type BudgetLineInput,
} from "./jobFinancials";

describe("jobFinancials - Pure function tests", () => {
  describe("calculateCostItemTotal", () => {
    it("prefers explicit totalCost over calculated cost", () => {
      const item: CostItemInput = {
        quantity: 10,
        unitCost: 100,
        totalCost: 500, // Explicit total takes precedence
      };
      expect(calculateCostItemTotal(item)).toBe(500);
    });

    it("calculates cost from quantity * unitCost when totalCost is zero", () => {
      const item: CostItemInput = {
        quantity: 10,
        unitCost: 100,
        totalCost: 0,
      };
      expect(calculateCostItemTotal(item)).toBe(1000);
    });

    it("calculates cost from quantity * unitCost when totalCost is null", () => {
      const item: CostItemInput = {
        quantity: 5,
        unitCost: 200,
        totalCost: null,
      };
      expect(calculateCostItemTotal(item)).toBe(1000);
    });

    it("defaults to quantity=1 if not provided", () => {
      const item: CostItemInput = {
        unitCost: 150,
      };
      expect(calculateCostItemTotal(item)).toBe(150);
    });

    it("defaults to unitCost=0 if not provided", () => {
      const item: CostItemInput = {
        quantity: 10,
      };
      expect(calculateCostItemTotal(item)).toBe(0);
    });

    it("handles all nulls gracefully", () => {
      const item: CostItemInput = {
        quantity: null,
        unitCost: null,
        totalCost: null,
      };
      expect(calculateCostItemTotal(item)).toBe(0);
    });
  });

  describe("calculateBudgetSubtotal", () => {
    it("sums budget lines when available", () => {
      const lines: BudgetLineInput[] = [
        { total: 10000 },
        { total: 20000 },
        { total: 5000 },
      ];
      expect(calculateBudgetSubtotal(lines, 0)).toBe(35000);
    });

    it("prefers budget lines over fallback value", () => {
      const lines: BudgetLineInput[] = [{ total: 10000 }];
      const fallback = 50000;
      expect(calculateBudgetSubtotal(lines, fallback)).toBe(10000);
    });

    it("uses fallback when budget lines are empty array", () => {
      const lines: BudgetLineInput[] = [];
      const fallback = 50000;
      expect(calculateBudgetSubtotal(lines, fallback)).toBe(50000);
    });

    it("uses fallback when budget lines are null", () => {
      expect(calculateBudgetSubtotal(null, 75000)).toBe(75000);
    });

    it("uses fallback when budget lines are undefined", () => {
      expect(calculateBudgetSubtotal(undefined, 100000)).toBe(100000);
    });

    it("handles null fallback gracefully", () => {
      expect(calculateBudgetSubtotal(null, null)).toBe(0);
    });

    it("handles null totals in budget lines", () => {
      const lines: BudgetLineInput[] = [
        { total: 10000 },
        { total: null },
        { total: 5000 },
      ];
      expect(calculateBudgetSubtotal(lines, 0)).toBe(15000);
    });
  });

  describe("calculateActualCost", () => {
    it("only includes locked cost items", () => {
      const items: CostItemInput[] = [
        { quantity: 10, unitCost: 100, lockStatus: "locked" },  // 1000
        { quantity: 5, unitCost: 200, lockStatus: "open" },     // Not included
        { quantity: 3, unitCost: 150, lockStatus: "locked" },   // 450
      ];
      expect(calculateActualCost(items)).toBe(1450);
    });

    it("excludes all items if none are locked", () => {
      const items: CostItemInput[] = [
        { quantity: 10, unitCost: 100, lockStatus: "open" },
        { quantity: 5, unitCost: 200, lockStatus: "draft" },
      ];
      expect(calculateActualCost(items)).toBe(0);
    });

    it("includes all items if all are locked", () => {
      const items: CostItemInput[] = [
        { quantity: 10, unitCost: 100, lockStatus: "locked" },  // 1000
        { quantity: 5, unitCost: 200, lockStatus: "locked" },   // 1000
      ];
      expect(calculateActualCost(items)).toBe(2000);
    });

    it("handles empty array", () => {
      expect(calculateActualCost([])).toBe(0);
    });
  });

  describe("calculateForecastCost", () => {
    it("includes all cost items regardless of lock status", () => {
      const items: CostItemInput[] = [
        { quantity: 10, unitCost: 100, lockStatus: "locked" },  // 1000
        { quantity: 5, unitCost: 200, lockStatus: "open" },     // 1000
        { quantity: 3, unitCost: 150, lockStatus: "draft" },    // 450
      ];
      expect(calculateForecastCost(items)).toBe(2450);
    });

    it("handles empty array", () => {
      expect(calculateForecastCost([])).toBe(0);
    });

    it("uses explicit totalCost if available", () => {
      const items: CostItemInput[] = [
        { quantity: 10, unitCost: 100, totalCost: 500, lockStatus: "open" },
      ];
      expect(calculateForecastCost(items)).toBe(500);
    });
  });

  describe("calculateMargin", () => {
    it("calculates positive margin when budget exceeds cost", () => {
      expect(calculateMargin(100000, 75000)).toBe(25000);
    });

    it("calculates negative margin when cost exceeds budget", () => {
      expect(calculateMargin(50000, 75000)).toBe(-25000);
    });

    it("calculates zero margin when equal", () => {
      expect(calculateMargin(100000, 100000)).toBe(0);
    });
  });

  describe("calculateMarginPercentage", () => {
    it("calculates positive margin percentage", () => {
      // Budget: 100,000, Cost: 75,000 -> Margin: 25,000 -> 25%
      expect(calculateMarginPercentage(100000, 75000)).toBe(0.25);
    });

    it("calculates negative margin percentage", () => {
      // Budget: 50,000, Cost: 75,000 -> Margin: -25,000 -> -50%
      expect(calculateMarginPercentage(50000, 75000)).toBe(-0.5);
    });

    it("returns 0 when budget is zero", () => {
      expect(calculateMarginPercentage(0, 10000)).toBe(0);
    });

    it("returns 0 when budget is negative", () => {
      expect(calculateMarginPercentage(-1000, 10000)).toBe(0);
    });

    it("calculates 100% margin when cost is zero", () => {
      expect(calculateMarginPercentage(100000, 0)).toBe(1);
    });
  });

  describe("calculateJobFinancials - Integration", () => {
    it("calculates complete financials correctly", () => {
      const budgetLines: BudgetLineInput[] = [
        { total: 50000 },
        { total: 30000 },
      ];

      const costItems: CostItemInput[] = [
        { quantity: 100, unitCost: 100, lockStatus: "locked" },  // 10,000 (actual)
        { quantity: 50, unitCost: 200, lockStatus: "locked" },   // 10,000 (actual)
        { quantity: 100, unitCost: 100, lockStatus: "open" },    // 10,000 (forecast only)
      ];

      const financials = calculateJobFinancials(budgetLines, 0, costItems);

      expect(financials.budgetSubtotal).toBe(80000);
      expect(financials.actualCost).toBe(20000);
      expect(financials.forecastCost).toBe(30000);
      expect(financials.actualMargin).toBe(60000);    // 80,000 - 20,000
      expect(financials.forecastMargin).toBe(50000);  // 80,000 - 30,000
      expect(financials.actualMarginPct).toBe(0.75);  // 60,000 / 80,000
      expect(financials.forecastMarginPct).toBe(0.625); // 50,000 / 80,000
    });

    it("handles job with no cost items", () => {
      const budgetLines: BudgetLineInput[] = [{ total: 100000 }];
      const costItems: CostItemInput[] = [];

      const financials = calculateJobFinancials(budgetLines, 0, costItems);

      expect(financials.budgetSubtotal).toBe(100000);
      expect(financials.actualCost).toBe(0);
      expect(financials.forecastCost).toBe(0);
      expect(financials.actualMargin).toBe(100000);
      expect(financials.forecastMargin).toBe(100000);
      expect(financials.actualMarginPct).toBe(1);
      expect(financials.forecastMarginPct).toBe(1);
    });

    it("handles job with no budget", () => {
      const costItems: CostItemInput[] = [
        { quantity: 10, unitCost: 100, lockStatus: "locked" },
      ];

      const financials = calculateJobFinancials(null, 0, costItems);

      expect(financials.budgetSubtotal).toBe(0);
      expect(financials.actualCost).toBe(1000);
      expect(financials.forecastCost).toBe(1000);
      expect(financials.actualMargin).toBe(-1000);
      expect(financials.forecastMargin).toBe(-1000);
      expect(financials.actualMarginPct).toBe(0);     // Avoid division by zero
      expect(financials.forecastMarginPct).toBe(0);   // Avoid division by zero
    });

    it("uses fallback budget when no budget lines", () => {
      const fallbackBudget = 50000;
      const costItems: CostItemInput[] = [
        { quantity: 100, unitCost: 100, lockStatus: "locked" },
      ];

      const financials = calculateJobFinancials(null, fallbackBudget, costItems);

      expect(financials.budgetSubtotal).toBe(50000);
      expect(financials.actualCost).toBe(10000);
      expect(financials.actualMargin).toBe(40000);
      expect(financials.actualMarginPct).toBe(0.8);
    });

    it("is deterministic - same inputs produce same outputs", () => {
      const budgetLines: BudgetLineInput[] = [{ total: 100000 }];
      const costItems: CostItemInput[] = [
        { quantity: 50, unitCost: 200, lockStatus: "locked" },
      ];

      const result1 = calculateJobFinancials(budgetLines, 0, costItems);
      const result2 = calculateJobFinancials(budgetLines, 0, costItems);

      expect(result1).toEqual(result2);
    });
  });
});
