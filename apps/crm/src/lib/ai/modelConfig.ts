/**
 * Single source of truth for the AI model used across the product.
 *
 * All AI call sites must reference this constant.
 * To change the model globally, update only this file.
 */
export const AI_MODEL = {
  provider: "openai" as const,
  model: "gpt-5-mini" as const,
};

/**
 * Engine mode logged in analytics/audit events.
 * Intentionally does NOT include provider or model names
 * so we can later introduce tiers without refactoring analytics.
 */
export const ENGINE_MODE = "standard" as const;
