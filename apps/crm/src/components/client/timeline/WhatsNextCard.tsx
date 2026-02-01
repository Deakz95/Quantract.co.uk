"use client";

import { Info } from "lucide-react";
import type { TimelineItem } from "./types";

type NextStep = { headline: string; body: string };

/**
 * Deterministic logic — no AI, no randomness.
 * Inspects the most recent timeline items and returns one contextual message.
 */
function deriveNextStep(items: TimelineItem[]): NextStep {
  if (items.length === 0) {
    return {
      headline: "Welcome",
      body: "Once work begins you\u2019ll see updates here. We\u2019ll keep everything in one place for you.",
    };
  }

  // Find the most recent item per category
  const latest: Partial<Record<string, TimelineItem>> = {};
  for (const it of items) {
    if (!latest[it.type]) latest[it.type] = it;
  }

  // Priority order — check most actionable first

  // 1. Unpaid invoice
  const inv = latest["invoice"];
  if (inv && (inv.status === "sent" || inv.status === "unpaid" || inv.status === "overdue")) {
    return {
      headline: "Invoice ready",
      body: "Your invoice has been issued. You can view, download, or pay it from the link below.",
    };
  }

  // 2. Quote awaiting response
  const quote = latest["quote"];
  if (quote && quote.status === "sent") {
    return {
      headline: "Quote awaiting your review",
      body: "We\u2019ve sent you a quote. Review the details and accept it when you\u2019re ready to proceed.",
    };
  }

  // 3. Job in progress
  const job = latest["job"];
  if (job && (job.status === "in_progress" || job.status === "scheduled")) {
    return {
      headline: "Work in progress",
      body: "Your job is underway. We\u2019ll update you here once it\u2019s completed.",
    };
  }

  // 4. Certificate issued
  const cert = latest["certificate"];
  if (cert) {
    return {
      headline: "Certificate issued",
      body: "Your compliance certificate is ready to download. Keep it safe for your records.",
    };
  }

  // 5. Job completed, all paid
  const jobDone = latest["job_completed"];
  const invPaid = latest["invoice_paid"];
  if (jobDone && invPaid) {
    return {
      headline: "All up to date",
      body: "Work is complete and payment received. We\u2019ll be in touch if follow-up work is recommended.",
    };
  }

  // 6. Job completed but no payment event yet
  if (jobDone) {
    return {
      headline: "Work complete",
      body: "The job has been completed. An invoice will follow shortly.",
    };
  }

  // 7. Quote accepted
  if (quote && quote.status === "accepted") {
    return {
      headline: "Quote accepted",
      body: "Great \u2014 we\u2019ll schedule the work and keep you updated on progress.",
    };
  }

  // 8. Payment received (fallback)
  if (invPaid) {
    return {
      headline: "Payment received",
      body: "Thank you. No further action required right now.",
    };
  }

  // Default
  return {
    headline: "No action needed",
    body: "Everything is up to date. We\u2019ll notify you when there\u2019s something new.",
  };
}

export default function WhatsNextCard({ items }: { items: TimelineItem[] }) {
  const step = deriveNextStep(items);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
      <div className="flex gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-[rgba(37,99,235,0.10)]">
          <Info size={18} strokeWidth={1.8} style={{ color: "#2563eb" }} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--foreground)]">
            {step.headline}
          </p>
          <p className="text-[13px] leading-snug text-[var(--muted-foreground)] mt-0.5">
            {step.body}
          </p>
        </div>
      </div>
    </div>
  );
}
