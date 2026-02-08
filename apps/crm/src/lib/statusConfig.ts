import type { BadgeVariant } from "@/components/ui/badge";

/**
 * Centralised status → badge-variant mapping for all entity types.
 * Single source of truth — avoids duplicated getStatusBadge() functions
 * across quotes, jobs, invoices, expenses, etc.
 */

type StatusEntry = { label: string; variant: BadgeVariant };

const QUOTE_STATUS: Record<string, StatusEntry> = {
  accepted: { label: "Accepted", variant: "success" },
  sent: { label: "Sent", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  draft: { label: "Draft", variant: "secondary" },
  rejected: { label: "Rejected", variant: "destructive" },
  expired: { label: "Expired", variant: "destructive" },
};

const JOB_STATUS: Record<string, StatusEntry> = {
  completed: { label: "Completed", variant: "success" },
  in_progress: { label: "In Progress", variant: "warning" },
  active: { label: "Active", variant: "warning" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  pending: { label: "Pending", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  on_hold: { label: "On Hold", variant: "destructive" },
};

const INVOICE_STATUS: Record<string, StatusEntry> = {
  paid: { label: "Paid", variant: "success" },
  sent: { label: "Sent", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  draft: { label: "Draft", variant: "secondary" },
  overdue: { label: "Overdue", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const EXPENSE_STATUS: Record<string, StatusEntry> = {
  confirmed: { label: "Confirmed", variant: "success" },
  parsed: { label: "Parsed", variant: "warning" },
  pending: { label: "Pending", variant: "secondary" },
};

const CERTIFICATE_STATUS: Record<string, StatusEntry> = {
  issued: { label: "Issued", variant: "success" },
  completed: { label: "Completed", variant: "secondary" },
  draft: { label: "Draft", variant: "outline" },
  void: { label: "Void", variant: "destructive" },
};

const TIMESHEET_STATUS: Record<string, StatusEntry> = {
  approved: { label: "Approved", variant: "success" },
  submitted: { label: "Submitted", variant: "warning" },
};

const REVIEW_STATUS: Record<string, StatusEntry> = {
  not_required: { label: "No Review", variant: "secondary" },
  pending_review: { label: "Pending Review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Changes Requested", variant: "destructive" },
};

const ENTITY_MAP: Record<string, Record<string, StatusEntry>> = {
  quote: QUOTE_STATUS,
  job: JOB_STATUS,
  invoice: INVOICE_STATUS,
  expense: EXPENSE_STATUS,
  certificate: CERTIFICATE_STATUS,
  timesheet: TIMESHEET_STATUS,
  review: REVIEW_STATUS,
};

export type EntityType = "quote" | "job" | "invoice" | "expense" | "certificate" | "timesheet" | "review";

/**
 * Returns { label, variant } for a given entity type + status string.
 * Falls back to { label: status, variant: "secondary" } when unknown.
 */
export function getStatusBadgeProps(
  entity: EntityType,
  status: string | undefined | null,
): StatusEntry {
  if (!status) {
    const defaults: Record<string, string> = { quote: "Draft", job: "Pending", invoice: "Draft", expense: "Pending" };
    return { label: defaults[entity] || status || "Unknown", variant: "secondary" };
  }
  const map = ENTITY_MAP[entity];
  const key = status.toLowerCase();
  return map?.[key] ?? { label: status, variant: "secondary" };
}
