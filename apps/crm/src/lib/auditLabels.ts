/**
 * Shared audit event formatting.
 *
 * Centralizes ACTION_LABELS and description-building logic so the
 * timeline API (and any future audit consumers) use consistent,
 * human-readable labels instead of raw UUIDs.
 */

export const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
  paid: "Marked paid",
  unpaid: "Marked unpaid",
  cancelled: "Cancelled",
  deleted: "Deleted",
  issued: "Issued",
  voided: "Voided",
  scheduled: "Scheduled",
  assigned: "Assigned",
  "invoice.created": "Invoice created",
  "invoice.sent": "Invoice sent",
  "invoice.paid": "Invoice paid",
  "invoice.unpaid": "Invoice unpaid",
  "invoice.viewed": "Invoice viewed",
  "invoice.soft_deleted": "Invoice deleted",
  "quote.sent": "Quote sent",
  "quote.accepted": "Quote accepted",
  "quote.rejected": "Quote rejected",
  "quote.viewed": "Quote viewed",
  "quote.soft_deleted": "Quote deleted",
  "job.created": "Job created",
  "job.completed": "Job completed",
  "job.scheduled": "Job scheduled",
  "job.auto_completed": "Job auto-completed",
  "job.soft_deleted": "Job deleted",
  "certificate.issued": "Certificate issued",
  "certificate.voided": "Certificate voided",
  "certificate.amendment_created": "Amendment created",
  "certificate.amendment_issued": "Amendment issued",
  "certificate.amendment_voided": "Amendment voided",
  "qr_tag.assigned": "QR tag assigned",
  "qr_tag.revoked": "QR tag revoked",
  "payment.link.created": "Payment link created",
  "site.created": "Site created",
  "site.updated": "Site updated",
  // RAMS & Tools
  "rams.created": "RAMS created",
  "rams.updated": "RAMS updated",
  "rams.issued": "RAMS issued",
  "rams.superseded": "RAMS superseded",
  "tool_output.saved": "Tool output saved",
  "tool_output.deleted": "Tool output deleted",
  // Scheduled checks
  "scheduled_check.created": "Check scheduled",
  "scheduled_check.completed": "Check completed",
  "scheduled_check.overdue": "Check overdue",
  // Checklist gating
  "job.completion.override": "Completion override",
};

/**
 * Convert a raw action string into a human-readable label.
 * Falls back to title-casing the raw string.
 */
export function formatAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Entity info that may be joined into an audit event.
 * All fields are optional because not every event has every relation.
 */
export type AuditEntityInfo = {
  entityType: string;
  action: string;
  job?: { id: string; title: string | null } | null;
  quote?: { id: string; clientName: string | null } | null;
  invoice?: { id: string; invoiceNumber: string | null; clientName: string | null } | null;
  certificate?: { id: string; certificateNumber: string | null } | null;
};

/**
 * Build a human-readable description for an audit event.
 *
 * Uses entity names (job title, invoice number, certificate number, client name)
 * rather than raw UUIDs.
 */
export function formatAuditDescription(event: AuditEntityInfo): string {
  const label = formatAction(event.action);

  if (event.entityType === "job" && event.job) {
    return `${event.job.title ?? "Job"} — ${label}`;
  }
  if (event.entityType === "quote" && event.quote) {
    return `Quote to ${event.quote.clientName ?? "client"} — ${label}`;
  }
  if (event.entityType === "invoice" && event.invoice) {
    return `Invoice #${event.invoice.invoiceNumber ?? ""} — ${label}`;
  }
  if (event.entityType === "certificate" && event.certificate) {
    return `Certificate #${event.certificate.certificateNumber ?? ""} — ${label}`;
  }
  if (event.entityType === "rams") {
    return `RAMS — ${label}`;
  }
  if (event.entityType === "tool_output") {
    return `Tool output — ${label}`;
  }
  if (event.entityType === "scheduled_check") {
    return `Scheduled check — ${label}`;
  }

  return `${event.entityType} — ${label}`;
}

/**
 * Actor role labels for display in timelines.
 */
const ACTOR_ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  office: "Office",
  engineer: "Engineer",
  client: "Client",
  system: "System",
};

/**
 * Resolve an actor to a human-readable display name.
 *
 * Returns both the stable actorId (for referential integrity) and a
 * displayName for the UI.
 */
export function formatActorLabel(
  actorRole?: string | null,
  actorName?: string | null,
  actorId?: string | null,
): { actorId: string | null; displayName: string } {
  const roleLabel = actorRole ? ACTOR_ROLE_LABELS[actorRole] ?? actorRole : null;

  if (actorName) {
    return {
      actorId: actorId ?? null,
      displayName: roleLabel ? `${actorName} (${roleLabel})` : actorName,
    };
  }

  return {
    actorId: actorId ?? null,
    displayName: roleLabel ?? "Unknown",
  };
}
