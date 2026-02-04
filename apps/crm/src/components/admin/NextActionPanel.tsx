"use client";

import { Info } from "lucide-react";
import Link from "next/link";

type Action = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type NextActionProps = {
  headline: string;
  body: string;
  actions?: Action[];
};

export default function NextActionPanel({ headline, body, actions }: NextActionProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
      <div className="flex gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-[rgba(37,99,235,0.10)]">
          <Info size={18} strokeWidth={1.8} style={{ color: "#2563eb" }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[var(--foreground)]">
            {headline}
          </p>
          <p className="text-[13px] leading-snug text-[var(--muted-foreground)] mt-0.5">
            {body}
          </p>
          {actions && actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {actions.map((action, i) =>
                action.href ? (
                  <Link
                    key={i}
                    href={action.href}
                    className="inline-flex items-center rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
                  >
                    {action.label}
                  </Link>
                ) : action.onClick ? (
                  <button
                    key={i}
                    type="button"
                    onClick={action.onClick}
                    className="inline-flex items-center rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
                  >
                    {action.label}
                  </button>
                ) : null,
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
