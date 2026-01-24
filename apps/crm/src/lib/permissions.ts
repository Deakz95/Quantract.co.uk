export type Capability =
  | "billing.view"
  | "billing.manage"
  | "invoices.view"
  | "invoices.manage"
  | "planner.manage"
  | "expenses.manage"
  | "suppliers.manage"
  | "settings.manage"
  | "users.manage";

export const ROLE_DEFAULTS: Record<string, Capability[]> = {
  ADMIN: [
    "billing.view","billing.manage",
    "invoices.view","invoices.manage",
    "planner.manage",
    "expenses.manage",
    "suppliers.manage",
    "settings.manage",
    "users.manage"
  ],
  OFFICE: ["invoices.view","planner.manage","expenses.manage","suppliers.manage"],
  ENGINEER: [],
  FINANCE: ["invoices.view","invoices.manage","expenses.manage","billing.view"],
};

export function hasCapability(role: string, caps: Capability[], required: Capability) {
  return caps.includes(required) || (ROLE_DEFAULTS[role] || []).includes(required);
}
