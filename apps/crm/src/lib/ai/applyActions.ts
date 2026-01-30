/**
 * Deterministic registry of one-click apply actions.
 * The AI model can tag recommendations with action IDs, but only
 * IDs present here are ever executed — no arbitrary model instructions.
 */

export type ApplyActionId =
  | "set_payment_terms_30"
  | "set_default_vat_20"
  | "enable_auto_chase"
  | "set_quote_validity_30";

export interface ApplyActionDef {
  label: string;
  description: string;
  /** The settings PATCH endpoint that performs the action. */
  endpoint: string;
  method: "PATCH";
  /** Static payload sent to the endpoint. */
  payload: Record<string, unknown>;
}

export const APPLY_ACTIONS: Record<ApplyActionId, ApplyActionDef> = {
  set_payment_terms_30: {
    label: "Set 30-day payment terms",
    description: "Sets default invoice payment terms to 30 days.",
    endpoint: "/api/admin/settings",
    method: "PATCH",
    payload: { defaultPaymentTermsDays: 30 },
  },
  set_default_vat_20: {
    label: "Set VAT to 20%",
    description: "Sets the default VAT rate to 20% on new invoices.",
    endpoint: "/api/admin/settings",
    method: "PATCH",
    payload: { defaultVatRate: 0.2 },
  },
  enable_auto_chase: {
    label: "Enable auto-chase",
    description: "Turns on automatic overdue invoice chase emails at 7, 14, and 21 days.",
    endpoint: "/api/admin/settings",
    method: "PATCH",
    payload: { autoChaseEnabled: true },
  },
  set_quote_validity_30: {
    label: "Set 30-day quote validity",
    description: "Sets quotes to expire after 30 days by default.",
    endpoint: "/api/admin/settings",
    method: "PATCH",
    payload: { quoteValidityDays: 30 },
  },
};

export const VALID_ACTION_IDS = new Set<string>(Object.keys(APPLY_ACTIONS));

export function isValidActionId(id: string): id is ApplyActionId {
  return VALID_ACTION_IDS.has(id);
}
