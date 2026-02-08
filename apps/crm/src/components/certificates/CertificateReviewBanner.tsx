"use client";

import { Clock, CheckCircle, XCircle } from "lucide-react";

type Props = {
  reviewStatus: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAtISO?: string;
};

export function CertificateReviewBanner({
  reviewStatus,
  reviewNotes,
  reviewedBy,
  reviewedAtISO,
}: Props) {
  if (reviewStatus === "not_required") return null;

  const formattedDate = reviewedAtISO
    ? new Date(reviewedAtISO).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : undefined;

  if (reviewStatus === "pending_review") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-sm">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
        <div>
          <p className="font-medium text-[var(--warning)]">
            This certificate is pending review
          </p>
          <p className="mt-0.5 text-[var(--muted-foreground)]">
            An office reviewer must approve this certificate before it can be completed.
          </p>
        </div>
      </div>
    );
  }

  if (reviewStatus === "approved") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/10 p-3 text-sm">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
        <div>
          <p className="font-medium text-[var(--success)]">
            Approved{reviewedBy ? ` by ${reviewedBy}` : ""}
            {formattedDate ? ` on ${formattedDate}` : ""}
          </p>
          {reviewNotes && (
            <p className="mt-0.5 text-[var(--muted-foreground)]">{reviewNotes}</p>
          )}
        </div>
      </div>
    );
  }

  if (reviewStatus === "rejected") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-3 text-sm">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--destructive)]" />
        <div>
          <p className="font-medium text-[var(--destructive)]">
            Changes requested{reviewedBy ? ` by ${reviewedBy}` : ""}
          </p>
          {reviewNotes && (
            <p className="mt-0.5 text-[var(--muted-foreground)]">{reviewNotes}</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
