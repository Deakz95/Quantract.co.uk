"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Button,
  NativeSelect,
} from "@quantract/ui";

export interface InspectionItem {
  category: string;
  itemCode: string;
  description: string;
  outcome: string; // "pass" | "fail" | "C1" | "C2" | "C3" | "na" | "lim" | ""
}

interface InspectionChecklistProps {
  items: InspectionItem[];
  onChange: (items: InspectionItem[]) => void;
}

const OUTCOME_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "pass", label: "Pass (\u2713)" },
  { value: "C1", label: "C1 - Danger present" },
  { value: "C2", label: "C2 - Potentially dangerous" },
  { value: "C3", label: "C3 - Improvement recommended" },
  { value: "na", label: "N/A - Not applicable" },
  { value: "lim", label: "LIM - Limitation" },
] as const;

const OUTCOME_COLORS: Record<string, string> = {
  C1: "var(--error)",
  C2: "#F59E0B",
  C3: "#EAB308",
  pass: "var(--success)",
};

function formatCategoryName(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function groupByCategory(items: InspectionItem[]): Map<string, InspectionItem[]> {
  const groups = new Map<string, InspectionItem[]>();
  for (const item of items) {
    const existing = groups.get(item.category);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(item.category, [item]);
    }
  }
  return groups;
}

function getCategorySummary(categoryItems: InspectionItem[]) {
  const total = categoryItems.length;
  const pass = categoryItems.filter((i) => i.outcome === "pass").length;
  const c1 = categoryItems.filter((i) => i.outcome === "C1").length;
  const c2 = categoryItems.filter((i) => i.outcome === "C2").length;
  const c3 = categoryItems.filter((i) => i.outcome === "C3").length;
  const na = categoryItems.filter((i) => i.outcome === "na").length;
  const lim = categoryItems.filter((i) => i.outcome === "lim").length;
  const unmarked = categoryItems.filter((i) => !i.outcome).length;

  const parts: string[] = [];
  if (pass > 0) parts.push(`${pass} pass`);
  if (c1 > 0) parts.push(`${c1} C1`);
  if (c2 > 0) parts.push(`${c2} C2`);
  if (c3 > 0) parts.push(`${c3} C3`);
  if (na > 0) parts.push(`${na} N/A`);
  if (lim > 0) parts.push(`${lim} LIM`);
  if (unmarked > 0) parts.push(`${unmarked} unmarked`);

  return { total, pass, c1, c2, c3, na, lim, unmarked, summary: parts.join(", ") };
}

export function InspectionChecklist({ items, onChange }: InspectionChecklistProps) {
  const grouped = groupByCategory(items);

  const handleOutcomeChange = (itemCode: string, category: string, newOutcome: string) => {
    const updated = items.map((item) =>
      item.itemCode === itemCode && item.category === category
        ? { ...item, outcome: newOutcome }
        : item
    );
    onChange(updated);
  };

  const handleMarkAllNA = (category: string) => {
    const updated = items.map((item) =>
      item.category === category ? { ...item, outcome: "na" } : item
    );
    onChange(updated);
  };

  // Overall summary counts
  const totalItems = items.length;
  const passCount = items.filter((i) => i.outcome === "pass").length;
  const c1Count = items.filter((i) => i.outcome === "C1").length;
  const c2Count = items.filter((i) => i.outcome === "C2").length;
  const c3Count = items.filter((i) => i.outcome === "C3").length;
  const naCount = items.filter((i) => i.outcome === "na").length;
  const limCount = items.filter((i) => i.outcome === "lim").length;
  const unmarkedCount = items.filter((i) => !i.outcome).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Inspection</CardTitle>
        <CardDescription>BS 7671 inspection items - mark each item</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([category, categoryItems]) => {
            const stats = getCategorySummary(categoryItems);

            return (
              <details key={category} open>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-4 h-4 text-[var(--muted-foreground)] transition-transform [details[open]>summary_&]:rotate-90"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <span className="font-semibold text-sm text-[var(--foreground)]">
                        {formatCategoryName(category)}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        ({stats.total} items)
                      </span>
                      {stats.summary && (
                        <span className="text-xs text-[var(--muted-foreground)] hidden sm:inline">
                          &mdash; {stats.summary}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        handleMarkAllNA(category);
                      }}
                    >
                      Mark All N/A
                    </Button>
                  </div>
                </summary>

                <div className="mt-1 ml-2 border-l-2 border-[var(--border)] pl-4 space-y-1">
                  {categoryItems.map((item) => (
                    <div
                      key={`${item.category}-${item.itemCode}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--muted)] transition-colors"
                    >
                      <span className="font-mono text-xs font-bold text-[var(--primary)] w-16 shrink-0">
                        {item.itemCode}
                      </span>
                      <span className="text-sm text-[var(--foreground)] flex-1 min-w-0">
                        {item.description}
                      </span>
                      <div className="w-56 shrink-0">
                        <NativeSelect
                          value={item.outcome}
                          onChange={(e) =>
                            handleOutcomeChange(item.itemCode, item.category, e.target.value)
                          }
                          className="text-sm"
                          style={{
                            color: item.outcome
                              ? OUTCOME_COLORS[item.outcome] || undefined
                              : undefined,
                          }}
                        >
                          {OUTCOME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>

        {/* Summary Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-5 py-3">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Total: {totalItems}
          </span>
          <div className="h-4 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)]" />
            <span className="text-xs text-[var(--muted-foreground)]">
              <strong className="text-[var(--foreground)]">{passCount}</strong> Pass
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--error)]" />
            <span className="text-xs text-[var(--muted-foreground)]">
              <strong className="text-[var(--foreground)]">{c1Count}</strong> C1
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#F59E0B" }} />
            <span className="text-xs text-[var(--muted-foreground)]">
              <strong className="text-[var(--foreground)]">{c2Count}</strong> C2
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#EAB308" }} />
            <span className="text-xs text-[var(--muted-foreground)]">
              <strong className="text-[var(--foreground)]">{c3Count}</strong> C3
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--muted-foreground)]" />
            <span className="text-xs text-[var(--muted-foreground)]">
              <strong className="text-[var(--foreground)]">{naCount}</strong> N/A
            </span>
          </div>
          {limCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--muted-foreground)]" />
              <span className="text-xs text-[var(--muted-foreground)]">
                <strong className="text-[var(--foreground)]">{limCount}</strong> LIM
              </span>
            </div>
          )}
          {unmarkedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full border border-[var(--border)] bg-transparent" />
              <span className="text-xs text-[var(--muted-foreground)]">
                <strong className="text-[var(--foreground)]">{unmarkedCount}</strong> unmarked
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default InspectionChecklist;
