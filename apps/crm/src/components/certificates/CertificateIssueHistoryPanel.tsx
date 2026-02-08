"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getIssueHistoryDisplay,
  type IssueHistoryEntry,
} from "@quantract/shared/certificate-types";

interface Props {
  certificateId: string;
  certStatus: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  issue: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  reissue: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  amend: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  void: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  ),
  email: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  download: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
};

const COLOR_MAP: Record<string, string> = {
  green: "text-green-600 bg-green-500/10",
  blue: "text-blue-600 bg-blue-500/10",
  amber: "text-amber-600 bg-amber-500/10",
  red: "text-red-600 bg-red-500/10",
  gray: "text-[var(--muted-foreground)] bg-[var(--muted)]/50",
};

export function CertificateIssueHistoryPanel({ certificateId, certStatus }: Props) {
  const [history, setHistory] = useState<IssueHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch for completed/issued/void certificates
    if (certStatus !== "completed" && certStatus !== "issued" && certStatus !== "void") {
      setLoading(false);
      return;
    }

    fetch(`/api/admin/certificates/${certificateId}/history`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.history)) {
          setHistory(d.history);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [certificateId, certStatus]);

  if (loading || history.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Issue & Distribution History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[var(--border)]" />

          {history.map((entry, i) => {
            const display = getIssueHistoryDisplay(entry.type);
            const colorClass = COLOR_MAP[display.color] ?? COLOR_MAP.gray;

            return (
              <div key={i} className="relative flex items-start gap-3 py-2">
                {/* Timeline dot */}
                <div className={`relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center ${colorClass}`}>
                  {ICON_MAP[display.icon]}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[var(--foreground)]">{display.label}</span>
                    {entry.revision != null && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Rev {entry.revision}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 space-x-2">
                    <span>{new Date(entry.atISO).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                    {entry.by && <span>by {entry.by}</span>}
                  </div>
                  {entry.recipientEmail && (
                    <div className="text-[11px] text-[var(--muted-foreground)]">
                      Sent to: {entry.recipientEmail}
                    </div>
                  )}
                  {entry.reason && (
                    <div className="text-[11px] text-[var(--muted-foreground)] italic mt-0.5">
                      Reason: {entry.reason}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
