"use client";

interface SummaryStatsBarProps {
  stats: {
    pass: number;
    c1: number;
    c2: number;
    c3: number;
    fi: number;
    total: number;
  };
}

export function SummaryStatsBar({ stats }: SummaryStatsBarProps) {
  const untested = stats.total - stats.pass - stats.c1 - stats.c2 - stats.c3 - stats.fi;

  const items: { color: string; label: string; count: number; always?: boolean }[] = [
    { color: "bg-emerald-500", label: "Pass", count: stats.pass },
    { color: "bg-red-700", label: "C1", count: stats.c1 },
    { color: "bg-red-500", label: "C2", count: stats.c2 },
    { color: "bg-amber-500", label: "C3", count: stats.c3 },
    { color: "bg-blue-500", label: "FI", count: stats.fi },
    { color: "bg-gray-500", label: "Untested", count: Math.max(0, untested), always: true },
  ];

  return (
    <div className="bg-[#1a1f2e] rounded-lg py-3 px-6 flex items-center justify-center gap-4 flex-wrap">
      <span className="text-sm text-[var(--muted-foreground)]">
        <strong className="text-[var(--primary)]">{stats.total}</strong> circuits
      </span>
      {items
        .filter((item) => item.count > 0 || item.always)
        .map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
            <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <strong className="text-[var(--foreground)]">{item.count}</strong> {item.label}
          </span>
        ))}
    </div>
  );
}
