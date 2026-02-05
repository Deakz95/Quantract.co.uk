// Re-export all money/VAT utilities from @quantract/shared
export {
  clampMoney,
  percentOf,
  remainingBalance,
  type VATCalculation,
  calculateVATFromSubtotal,
  calculateSubtotalFromTotal,
  calculateZeroRatedVAT,
  validateVATCalculation,
} from "@quantract/shared";
