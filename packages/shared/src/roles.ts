/**
 * Role types and constants shared across all Quantract applications.
 */

/**
 * Supported roles in the system.
 * - admin: Full access to company data and settings
 * - office: Back-office staff with limited permissions
 * - finance: Finance team with billing/invoice access
 * - engineer: Field engineers with job-specific access
 * - client: External clients with portal access
 */
export type Role = "admin" | "office" | "finance" | "engineer" | "client";

/** All valid roles for iteration */
export const ALL_ROLES: Role[] = [
  "admin",
  "office",
  "finance",
  "engineer",
  "client",
];
