"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResultRow {
  label: string;
  value: string;
  highlight?: boolean;
}

interface ResultsPanelProps {
  title?: string;
  rows: ResultRow[];
  notes?: string;
  /** Raw text representation for clipboard copy */
  copyText?: string;
}

export function ResultsPanel({ title = "Results", rows, notes, copyText }: ResultsPanelProps) {
  const [copied, setCopied] = useState(false);

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-[var(--muted-foreground)]">
          Enter values and press Calculate to see results.
        </CardContent>
      </Card>
    );
  }

  const handleCopy = async () => {
    const text = copyText ?? rows.map((r) => `${r.label}: ${r.value}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex items-center justify-between gap-4 py-2 px-3 rounded-lg ${
                row.highlight
                  ? "bg-[var(--primary)]/10 border border-[var(--primary)]/20"
                  : "border border-transparent"
              }`}
            >
              <span className="text-sm text-[var(--muted-foreground)]">{row.label}</span>
              <span className={`text-sm font-semibold text-[var(--foreground)] text-right ${row.highlight ? "text-base" : ""}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
        {notes && (
          <div className="mt-4 p-3 rounded-lg bg-[var(--muted)]/50 border border-[var(--border)]">
            <p className="text-xs text-[var(--muted-foreground)] whitespace-pre-line">{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
