/**
 * Pure financial calculation functions for job costing.
 * These functions have NO side effects and are easily testable.
 *
 * CRITICAL: All monetary calculations must be deterministic and auditable.
 */

export interface CostItemInput {
  quantity?: number | null;
  unitCost?: number | null;
  totalCost?: number | null;
  lockStatus?: string | null;
}

export interface BudgetLineInput {
  total: number | null;
}

export interface JobFinancials {
  budgetSubtotal: number;
  actualCost: number;
  forecastCost: number;
  actualMargin: number;
  forecastMargin: number;
  actualMarginPct: number;
  forecastMarginPct: number;
}

/**
 * Calculate the total cost of a single cost item.
 * Prefers explicit totalCost, falls back to quantity * unitCost.
 */
export function calculateCostItemTotal(item: CostItemInput): number {
  // Prefer explicit totalCost if available and positive
  if (item.totalCost != null && Number(item.totalCost) > 0) {
    return Number(item.totalCost);
  }

  // Fall back to calculated cost
  const quantity = Number(item.quantity ?? 1);
  const unitCost = Number(item.unitCost ?? 0);
  return quantity * unitCost;
}

/**
 * Calculate budget subtotal from budget lines or fallback value.
 * Budget lines take precedence over the fallback budgetSubtotal field.
 */
export function calculateBudgetSubtotal(
  budgetLines: BudgetLineInput[] | null | undefined,
  fallbackBudgetSubtotal: number | null | undefined
): number {
  if (budgetLines && budgetLines.length > 0) {
    return budgetLines.reduce((sum, line) => sum + Number(line.total ?? 0), 0);
  }
  return Number(fallbackBudgetSubtotal ?? 0);
}

/**
 * Calculate actual cost (only locked cost items).
 * Locked items represent confirmed, immutable costs.
 */
export function calculateActualCost(costItems: CostItemInput[]): number {
  return costItems.reduce((sum, item) => {
    if (item.lockStatus === "locked") {
      return sum + calculateCostItemTotal(item);
    }
    return sum;
  }, 0);
}

/**
 * Calculate forecast cost (all cost items, locked or open).
 * Represents the expected total cost including uncommitted items.
 */
export function calculateForecastCost(costItems: CostItemInput[]): number {
  return costItems.reduce((sum, item) => sum + calculateCostItemTotal(item), 0);
}

/**
 * Calculate margin (revenue - cost).
 */
export function calculateMargin(budget: number, cost: number): number {
  return budget - cost;
}

/**
 * Calculate margin percentage.
 * Returns 0 if budget is zero or negative (avoid division by zero).
 */
export function calculateMarginPercentage(budget: number, cost: number): number {
  if (budget <= 0) return 0;
  const margin = calculateMargin(budget, cost);
  return margin / budget;
}

/**
 * Calculate complete job financials from raw data.
 * This is the single source of truth for all financial calculations.
 *
 * INVARIANT: All inputs are treated as immutable.
 * INVARIANT: Calculations are deterministic given the same inputs.
 */
export function calculateJobFinancials(
  budgetLines: BudgetLineInput[] | null | undefined,
  fallbackBudgetSubtotal: number | null | undefined,
  costItems: CostItemInput[]
): JobFinancials {
  const budgetSubtotal = calculateBudgetSubtotal(budgetLines, fallbackBudgetSubtotal);
  const actualCost = calculateActualCost(costItems);
  const forecastCost = calculateForecastCost(costItems);
  const actualMargin = calculateMargin(budgetSubtotal, actualCost);
  const forecastMargin = calculateMargin(budgetSubtotal, forecastCost);
  const actualMarginPct = calculateMarginPercentage(budgetSubtotal, actualCost);
  const forecastMarginPct = calculateMarginPercentage(budgetSubtotal, forecastCost);

  return {
    budgetSubtotal,
    actualCost,
    forecastCost,
    actualMargin,
    forecastMargin,
    actualMarginPct,
    forecastMarginPct,
  };
}
