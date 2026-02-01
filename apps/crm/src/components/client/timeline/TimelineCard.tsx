"use client";

import Link from "next/link";
import { Briefcase, FileText, Shield } from "lucide-react";
import StatusPill from "./StatusPill";
import type { TimelineItem } from "./types";

const TYPE_CONFIG: Record<string, { Icon: typeof Briefcase; bg: string; fg: string }> = {
  job:         { Icon: Briefcase,   bg: "rgba(249,115,22,0.10)", fg: "#ea580c" },
  invoice:     { Icon: FileText,    bg: "rgba(139,92,246,0.10)", fg: "#7c3aed" },
  certificate: { Icon: Shield,      bg: "rgba(16,185,129,0.10)", fg: "#059669" },
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

export default function TimelineCard({ item }: { item: TimelineItem }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.job;
  const { Icon } = cfg;

  return (
    <div className="flex gap-3.5">
      {/* Icon */}
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
        style={{ backgroundColor: cfg.bg }}
      >
        <Icon size={18} strokeWidth={1.8} style={{ color: cfg.fg }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title row */}
        <p className="text-[15px] font-semibold leading-snug text-[var(--foreground)] truncate">
          {item.title}
        </p>

        {/* Subtitle */}
        {item.subtitle && (
          <p className="text-[13px] leading-snug text-[var(--muted-foreground)] mt-0.5 truncate">
            {item.subtitle}
          </p>
        )}

        {/* Meta row: date + status */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="text-[12px] text-[var(--muted-foreground)]">
            {formatDate(item.ts)}
          </span>
          <StatusPill status={item.status} />
        </div>

        {/* Action buttons */}
        {(item.href || item.pdfHref) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {item.href && (
              <Link
                href={item.href}
                className="inline-flex items-center justify-center h-8 px-3.5 text-[13px] font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                View
              </Link>
            )}
            {item.pdfHref && (
              <a
                href={item.pdfHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-8 px-3.5 text-[13px] font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                Download PDF
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
