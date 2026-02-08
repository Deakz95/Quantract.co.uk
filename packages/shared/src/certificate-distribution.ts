/**
 * Certificate Distribution & Issue History (CERT-A24)
 *
 * Types and helpers for tracking certificate distribution (email, download)
 * and issue history (revisions, re-issues, superseding).
 * Distribution events are logged via the existing audit events system.
 */

// ─── Types ──────────────────────────────────────────────────────────

/** How the certificate was distributed */
export type DistributionMethod = "email" | "download" | "print";

/** A single distribution event */
export interface DistributionEntry {
  method: DistributionMethod;
  recipientEmail?: string;
  recipientName?: string;
  sentAtISO: string;
  revision?: number;
  sentBy?: string;
  notes?: string;
}

/** Issue history entry — represents a revision or re-issue */
export interface IssueHistoryEntry {
  type: "issued" | "reissued" | "amended" | "voided" | "emailed" | "downloaded";
  atISO: string;
  by?: string;
  revision?: number;
  reason?: string;
  recipientEmail?: string;
  certificateId?: string;
  notes?: string;
}

/** Re-issue request with reason tracking */
export interface ReissueRequest {
  reason: string;
  notes?: string;
}

/** Display metadata for an issue history entry */
export interface IssueHistoryDisplay {
  label: string;
  description: string;
  color: string;
  icon: "issue" | "reissue" | "amend" | "void" | "email" | "download";
}

// ─── Pure Functions ─────────────────────────────────────────────────

/**
 * Get display metadata for an issue history entry type.
 */
export function getIssueHistoryDisplay(type: IssueHistoryEntry["type"]): IssueHistoryDisplay {
  switch (type) {
    case "issued":
      return { label: "Issued", description: "Certificate issued with PDF", color: "green", icon: "issue" };
    case "reissued":
      return { label: "Re-issued", description: "Certificate re-issued as new draft", color: "blue", icon: "reissue" };
    case "amended":
      return { label: "Amendment", description: "Amendment created from this certificate", color: "amber", icon: "amend" };
    case "voided":
      return { label: "Voided", description: "Certificate voided", color: "red", icon: "void" };
    case "emailed":
      return { label: "Emailed", description: "Certificate emailed to recipient", color: "blue", icon: "email" };
    case "downloaded":
      return { label: "Downloaded", description: "PDF downloaded", color: "gray", icon: "download" };
  }
}

/**
 * Build issue history from audit events.
 * Transforms raw audit events into structured history entries.
 */
export function buildIssueHistory(auditEvents: Array<{
  action: string;
  createdAt: string;
  actorName?: string;
  meta?: Record<string, unknown>;
}>): IssueHistoryEntry[] {
  const entries: IssueHistoryEntry[] = [];

  for (const event of auditEvents) {
    const meta = event.meta ?? {};
    switch (event.action) {
      case "certificate.issued":
      case "certificate.amendment_issued":
        entries.push({
          type: "issued",
          atISO: event.createdAt,
          by: event.actorName,
          revision: typeof meta.revision === "number" ? meta.revision : undefined,
          notes: event.action === "certificate.amendment_issued" ? "Amendment issued" : undefined,
        });
        break;
      case "certificate.reissued":
        entries.push({
          type: "reissued",
          atISO: event.createdAt,
          by: event.actorName,
          reason: typeof meta.reason === "string" ? meta.reason : undefined,
          certificateId: typeof meta.newCertificateId === "string" ? meta.newCertificateId : undefined,
        });
        break;
      case "certificate.amendment_created":
        entries.push({
          type: "amended",
          atISO: event.createdAt,
          by: event.actorName,
          certificateId: typeof meta.amendmentId === "string" ? meta.amendmentId : undefined,
        });
        break;
      case "certificate.voided":
      case "certificate.amendment_voided":
        entries.push({
          type: "voided",
          atISO: event.createdAt,
          by: event.actorName,
          reason: typeof meta.reason === "string" ? meta.reason : undefined,
        });
        break;
      case "certificate.emailed":
        entries.push({
          type: "emailed",
          atISO: event.createdAt,
          by: event.actorName,
          recipientEmail: typeof meta.recipientEmail === "string" ? meta.recipientEmail : undefined,
          revision: typeof meta.revision === "number" ? meta.revision : undefined,
        });
        break;
      case "certificate.downloaded":
        entries.push({
          type: "downloaded",
          atISO: event.createdAt,
          by: event.actorName,
          revision: typeof meta.revision === "number" ? meta.revision : undefined,
        });
        break;
    }
  }

  // Sort newest first
  entries.sort((a, b) => new Date(b.atISO).getTime() - new Date(a.atISO).getTime());
  return entries;
}

/**
 * Get distribution-only entries from issue history.
 */
export function getDistributionHistory(history: IssueHistoryEntry[]): IssueHistoryEntry[] {
  return history.filter((e) => e.type === "emailed" || e.type === "downloaded");
}

/**
 * Check if a certificate has been distributed (emailed or downloaded).
 */
export function hasBeenDistributed(history: IssueHistoryEntry[]): boolean {
  return history.some((e) => e.type === "emailed" || e.type === "downloaded");
}

/**
 * Get the latest issue event.
 */
export function getLatestIssue(history: IssueHistoryEntry[]): IssueHistoryEntry | null {
  return history.find((e) => e.type === "issued") ?? null;
}
