"use client";

import { SubCard } from "./ui/SubCard";

interface SummaryOfConditionProps {
  c1Count: number;
  c2Count: number;
  c3Count: number;
  fiCount: number;
}

const CODES = [
  { key: "c1", label: "C1", desc: "Danger present", bg: "bg-red-500", border: "border-red-500" },
  { key: "c2", label: "C2", desc: "Potentially dangerous", bg: "bg-amber-500", border: "border-amber-500" },
  { key: "c3", label: "C3", desc: "Improvement recommended", bg: "bg-yellow-400", border: "border-yellow-400" },
  { key: "fi", label: "FI", desc: "Further investigation", bg: "bg-blue-500", border: "border-blue-500" },
] as const;

export function SummaryOfCondition({ c1Count, c2Count, c3Count, fiCount }: SummaryOfConditionProps) {
  const counts = { c1: c1Count, c2: c2Count, c3: c3Count, fi: fiCount };
  const total = c1Count + c2Count + c3Count + fiCount;

  return (
    <SubCard title="Auto-generated Summary">
      <div className="space-y-4">
        {/* Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CODES.map(({ key, label, desc, bg, border }) => (
            <div
              key={key}
              className={`rounded-lg border ${border} bg-[#0f1115] p-3 text-center`}
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${bg} text-white font-bold text-lg mb-1`}>
                {counts[key]}
              </div>
              <p className="text-sm font-semibold text-[#e2e8f0]">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
          ))}
        </div>

        {/* Proportion bar */}
        {total > 0 && (
          <div className="space-y-1.5">
            <div className="flex rounded-full h-3 overflow-hidden bg-[#0f1115]">
              {c1Count > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(c1Count / total) * 100}%` }} />}
              {c2Count > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${(c2Count / total) * 100}%` }} />}
              {c3Count > 0 && <div className="bg-yellow-400 transition-all" style={{ width: `${(c3Count / total) * 100}%` }} />}
              {fiCount > 0 && <div className="bg-blue-500 transition-all" style={{ width: `${(fiCount / total) * 100}%` }} />}
            </div>
            <p className="text-xs text-gray-400 text-center">
              {total} total observation{total !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {total === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">
            No observations recorded yet. This summary updates automatically.
          </p>
        )}
      </div>
    </SubCard>
  );
}

export type { SummaryOfConditionProps };
