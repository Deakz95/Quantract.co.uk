"use client";

import Link from "next/link";
import {
  Briefcase,
  FileText,
  Shield,
  CheckCircle2,
  FileBarChart,
  Download,
  Eye,
} from "lucide-react";
import StatusPill from "./StatusPill";
import type { TimelineItem } from "./types";

const TYPE_CONFIG: Record<
  string,
  { Icon: typeof Briefcase; bg: string; fg: string }
> = {
  job:            { Icon: Briefcase,     bg: "rgba(249,115,22,0.10)", fg: "#ea580c" },
  job_completed:  { Icon: CheckCircle2,  bg: "rgba(22,163,74,0.10)",  fg: "#15803d" },
  invoice:        { Icon: FileText,      bg: "rgba(139,92,246,0.10)", fg: "#7c3aed" },
  invoice_paid:   { Icon: CheckCircle2,   bg: "rgba(22,163,74,0.10)",  fg: "#15803d" },
  certificate:    { Icon: Shield,        bg: "rgba(16,185,129,0.10)", fg: "#059669" },
  quote:          { Icon: FileBarChart,  bg: "rgba(37,99,235,0.10)",  fg: "#2563eb" },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function pounds(n: number | undefined) {
  if (n == null || !Number.isFinite(n)) return "";
  return `\u00A3${n.toFixed(2)}`;
}

export default function TimelineCard({ item }: { item: TimelineItem }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.job;
  const { Icon } = cfg;

  return (
    <div className="flex gap-3.5">
      {/* Icon badge */}
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
        style={{ backgroundColor: cfg.bg }}
      >
        <Icon size={18} strokeWidth={1.8} style={{ color: cfg.fg }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <p className="text-[15px] font-semibold leading-snug text-[var(--foreground)] truncate">
          {item.title}
        </p>

        {/* Subtitle */}
        {item.subtitle && (
          <p className="text-[13px] leading-snug text-[var(--muted-foreground)] mt-0.5 truncate">
            {item.subtitle}
          </p>
        )}

        {/* Invoice amount (inline, subtle) */}
        {item.type === "invoice" && item.total != null && (
          <p className="text-[13px] font-medium text-[var(--foreground)] mt-0.5">
            {pounds(item.total)}
            {item.vat != null && item.vat > 0 && (
              <span className="text-[11px] font-normal text-[var(--muted-foreground)] ml-1.5">
                incl. {pounds(item.vat)} VAT
              </span>
            )}
          </p>
        )}

        {/* Payment amount */}
        {item.type === "invoice_paid" && item.total != null && (
          <p className="text-[13px] font-medium text-[var(--foreground)] mt-0.5">
            {pounds(item.total)}
          </p>
        )}

        {/* Certificate details */}
        {item.type === "certificate" && (
          <div className="mt-0.5">
            {item.issuedDate && (
              <p className="text-[12px] text-[var(--muted-foreground)]">
                Issued {formatDate(item.issuedDate)}
              </p>
            )}
          </div>
        )}

        {/* Meta row: date + status */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="text-[12px] text-[var(--muted-foreground)]">
            {formatDate(item.ts)}
          </span>
          {item.type !== "invoice_paid" && item.type !== "job_completed" && (
            <StatusPill status={item.status} />
          )}
        </div>

        {/* Action buttons */}
        {(item.href || item.pdfHref) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {item.href && (
              <Link
                href={item.href}
                className="inline-flex items-center justify-center gap-1.5 h-9 min-w-[44px] px-3.5 text-[13px] font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <Eye size={14} strokeWidth={1.8} />
                View
              </Link>
            )}
            {item.pdfHref && (
              <a
                href={item.pdfHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 h-9 min-w-[44px] px-3.5 text-[13px] font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                <Download size={14} strokeWidth={1.8} />
                Download PDF
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
