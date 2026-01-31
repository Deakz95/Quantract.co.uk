/**
 * Fine-grained capabilities for permission checks.
 * Used with UserPermission table for per-user overrides.
 */
export type Capability =
  | "billing.view"
  | "billing.manage"
  | "invoices.view"
  | "invoices.manage"
  | "planner.manage"
  | "expenses.manage"
  | "suppliers.manage"
  | "settings.manage"
  | "users.manage"
  | "leads.scoring"
  | "maintenance.manage"
  | "maintenance.view";

/**
 * Default capabilities by role.
 * Keys must match Role type values (uppercase for lookup).
 *
 * Roles:
 * - ADMIN: Full access to all features
 * - OFFICE: Back-office staff (invoices view, planner, expenses, suppliers)
 * - FINANCE: Finance team (invoices full, expenses, billing view)
 * - ENGINEER: Field engineers (no default capabilities - job-specific access)
 * - CLIENT: External clients (no default capabilities - portal access only)
 */
export const ROLE_DEFAULTS: Record<string, Capability[]> = {
  ADMIN: [
    "billing.view",
    "billing.manage",
    "invoices.view",
    "invoices.manage",
    "planner.manage",
    "expenses.manage",
    "suppliers.manage",
    "settings.manage",
    "users.manage",
    "leads.scoring",
    "maintenance.manage",
    "maintenance.view",
  ],
  OFFICE: ["invoices.view", "planner.manage", "expenses.manage", "suppliers.manage", "maintenance.view"],
  FINANCE: ["invoices.view", "invoices.manage", "expenses.manage", "billing.view"],
  ENGINEER: [],
  CLIENT: [],
};

/**
 * Check if a role has a capability, considering:
 * 1. Explicit capability grants (from caps array)
 * 2. Role defaults (from ROLE_DEFAULTS)
 */
export function hasCapability(role: string, caps: Capability[], required: Capability): boolean {
  // Check explicit grants first
  if (caps.includes(required)) return true;

  // Check role defaults (normalize to uppercase for lookup)
  const roleKey = role.toUpperCase();
  return (ROLE_DEFAULTS[roleKey] || []).includes(required);
}
