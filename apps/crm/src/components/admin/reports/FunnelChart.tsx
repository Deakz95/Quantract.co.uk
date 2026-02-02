"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type FunnelStage = {
  name: string;
  count: number;
  value: number;
  probability?: number;
  color?: string;
};

export type FunnelChartProps = {
  title?: string;
  stages: FunnelStage[];
  formatValue?: (value: number) => string;
};

const defaultColors = [
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#a855f7", // purple-500
  "#d946ef", // fuchsia-500
  "#ec4899", // pink-500
  "#f43f5e", // rose-500
  "#ef4444", // red-500
];

export function FunnelChart({
  title = "Pipeline Funnel",
  stages,
  formatValue = (v) => `$${v.toLocaleString()}`,
}: FunnelChartProps) {
  if (stages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-[var(--muted-foreground)]">
            No stages to display
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const totalValue = stages.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stages.map((stage, index) => {
            const widthPercent = Math.max((stage.count / maxCount) * 100, 10);
            const color = stage.color || defaultColors[index % defaultColors.length];

            return (
              <div key={index} className="group">
                {/* Funnel bar with trapezoid effect */}
                <div className="relative flex items-center">
                  {/* Stage bar */}
                  <div
                    className="relative h-12 rounded-lg transition-all duration-300 group-hover:shadow-lg flex items-center justify-between px-4"
                    style={{
                      width: `${widthPercent}%`,
                      minWidth: "160px",
                      backgroundColor: color,
                      clipPath: index === stages.length - 1
                        ? undefined
                        : "polygon(0 0, 100% 0, 98% 100%, 2% 100%)",
                    }}
                  >
                    <span className="text-white font-semibold text-sm whitespace-nowrap">
                      {stage.name}
                    </span>
                    <span className="text-white/90 text-xs font-medium whitespace-nowrap ml-2">
                      {stage.count}
                    </span>
                  </div>

                  {/* Value label */}
                  <div className="ml-4 flex-shrink-0">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {formatValue(stage.value)}
                    </span>
                    {stage.probability !== undefined && (
                      <span className="text-xs text-[var(--muted-foreground)] ml-2">
                        ({stage.probability}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Conversion rate to next stage */}
                {index < stages.length - 1 && stages[index + 1] && stage.count > 0 && (
                  <div className="flex items-center gap-2 py-1 pl-4">
                    <div className="w-px h-3 bg-[var(--border)]" />
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {Math.round((stages[index + 1].count / stage.count) * 100)}% conversion
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <div>
            <span className="text-sm text-[var(--muted-foreground)]">Total Pipeline Value</span>
            <div className="text-xl font-bold text-[var(--foreground)]">{formatValue(totalValue)}</div>
          </div>
          <div className="text-right">
            <span className="text-sm text-[var(--muted-foreground)]">Total Deals</span>
            <div className="text-xl font-bold text-[var(--foreground)]">
              {stages.reduce((sum, s) => sum + s.count, 0)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
