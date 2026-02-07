"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@quantract/ui";

interface SummaryOfConditionProps {
  c1Count: number;
  c2Count: number;
  c3Count: number;
  fiCount: number;
}

export function SummaryOfCondition({
  c1Count,
  c2Count,
  c3Count,
  fiCount,
}: SummaryOfConditionProps) {
  const total = c1Count + c2Count + c3Count + fiCount;

  const badges = [
    { label: "C1", count: c1Count, bg: "bg-red-500", text: "text-white" },
    { label: "C2", count: c2Count, bg: "bg-amber-500", text: "text-white" },
    { label: "C3", count: c3Count, bg: "bg-yellow-400", text: "text-gray-900" },
    { label: "FI", count: fiCount, bg: "bg-blue-500", text: "text-white" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary of Condition</CardTitle>
        <CardDescription>
          Observation counts by classification code
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Count badges */}
        <div className="flex flex-wrap gap-3">
          {badges.map((badge) => (
            <div
              key={badge.label}
              className={`${badge.bg} ${badge.text} rounded-xl px-4 py-2 flex items-center gap-2 min-w-[80px]`}
            >
              <span className="text-sm font-semibold">{badge.label}</span>
              <span className="text-xl font-bold">{badge.count}</span>
            </div>
          ))}
        </div>

        {/* Proportional bar */}
        {total > 0 && (
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-[var(--muted)]">
            {c1Count > 0 && (
              <div
                className="bg-red-500 h-full transition-all duration-300"
                style={{ width: `${(c1Count / total) * 100}%` }}
              />
            )}
            {c2Count > 0 && (
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${(c2Count / total) * 100}%` }}
              />
            )}
            {c3Count > 0 && (
              <div
                className="bg-yellow-400 h-full transition-all duration-300"
                style={{ width: `${(c3Count / total) * 100}%` }}
              />
            )}
            {fiCount > 0 && (
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${(fiCount / total) * 100}%` }}
              />
            )}
          </div>
        )}

        {/* Total */}
        <div className="text-sm text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{total}</span>{" "}
          {total === 1 ? "observation" : "observations"} recorded
        </div>
      </CardContent>
    </Card>
  );
}

export type { SummaryOfConditionProps };
