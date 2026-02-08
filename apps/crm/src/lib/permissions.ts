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
  | "maintenance.view"
  | "accounts.access"
  | "cert.review"
  | "cert.signoff";

/** Human-readable labels for each capability (used in role preset UI). */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  "billing.view": "View billing",
  "billing.manage": "Manage billing",
  "invoices.view": "View invoices",
  "invoices.manage": "Manage invoices",
  "planner.manage": "Manage planner",
  "expenses.manage": "Manage expenses",
  "suppliers.manage": "Manage suppliers",
  "settings.manage": "Manage settings",
  "users.manage": "Manage users",
  "leads.scoring": "Lead scoring",
  "maintenance.manage": "Manage maintenance",
  "maintenance.view": "View maintenance",
  "accounts.access": "Accounts access",
  "cert.review": "Review certificates",
  "cert.signoff": "Sign off certificates",
};

/**
 * Role preset definitions with human-readable descriptions.
 * Used on the Users admin page to explain what each preset grants.
 */
export const ROLE_PRESETS: Record<string, { label: string; description: string; capabilities: Capability[] }> = {
  ADMIN: {
    label: "Admin",
    description: "Full access to all features including billing, settings, and user management.",
    capabilities: [
      "billing.view", "billing.manage", "invoices.view", "invoices.manage",
      "planner.manage", "expenses.manage", "suppliers.manage", "settings.manage",
      "users.manage", "leads.scoring", "maintenance.manage", "maintenance.view",
      "accounts.access", "cert.review", "cert.signoff",
    ],
  },
  OFFICE: {
    label: "Office",
    description: "Back-office staff — can view invoices, manage the planner, expenses, suppliers, and view maintenance.",
    capabilities: ["invoices.view", "planner.manage", "expenses.manage", "suppliers.manage", "maintenance.view", "cert.review", "cert.signoff"],
  },
  FINANCE: {
    label: "Finance",
    description: "Finance team — full invoice management, expenses, and billing visibility.",
    capabilities: ["invoices.view", "invoices.manage", "expenses.manage", "billing.view", "accounts.access"],
  },
  ENGINEER: {
    label: "Engineer",
    description: "Field engineers — job-specific access via the engineer portal. No default admin capabilities.",
    capabilities: [],
  },
  CLIENT: {
    label: "Client",
    description: "External clients — portal access only. No admin capabilities.",
    capabilities: [],
  },
};

/**
 * Default capabilities by role (derived from ROLE_PRESETS for backwards compatibility).
 */
export const ROLE_DEFAULTS: Record<string, Capability[]> = Object.fromEntries(
  Object.entries(ROLE_PRESETS).map(([key, preset]) => [key, preset.capabilities])
);

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
