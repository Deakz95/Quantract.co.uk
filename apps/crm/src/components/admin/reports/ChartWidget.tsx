"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ChartDataPoint = {
  label: string;
  value: number;
  color?: string;
};

export type ChartWidgetProps = {
  title: string;
  data: ChartDataPoint[];
  type: "bar" | "line";
  formatValue?: (value: number) => string;
};

export function ChartWidget({ title, data, type, formatValue = (v) => v.toLocaleString() }: ChartWidgetProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-[var(--muted-foreground)]">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {type === "bar" ? (
          <BarChart data={data} maxValue={maxValue} formatValue={formatValue} />
        ) : (
          <LineChart data={data} maxValue={maxValue} formatValue={formatValue} />
        )}
      </CardContent>
    </Card>
  );
}

function BarChart({
  data,
  maxValue,
  formatValue,
}: {
  data: ChartDataPoint[];
  maxValue: number;
  formatValue: (value: number) => string;
}) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        const color = item.color || "var(--primary)";

        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--foreground)] font-medium truncate max-w-[60%]">
                {item.label}
              </span>
              <span className="text-[var(--muted-foreground)]">{formatValue(item.value)}</span>
            </div>
            <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.max(percentage, 2)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({
  data,
  maxValue,
  formatValue,
}: {
  data: ChartDataPoint[];
  maxValue: number;
  formatValue: (value: number) => string;
}) {
  const height = 200;
  const width = 100; // Percentage-based
  const padding = { top: 20, right: 10, bottom: 40, left: 10 };

  const points = data.map((item, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * (width - padding.left - padding.right) + padding.left;
    const y = height - padding.bottom - ((item.value / maxValue) * (height - padding.top - padding.bottom));
    return { x, y, ...item };
  });

  // Create path for line
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x}% ${p.y}`)
    .join(" ");

  // Create path for gradient fill
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0}% ${height - padding.bottom} L ${padding.left}% ${height - padding.bottom} Z`;

  return (
    <div className="relative" style={{ height: `${height}px` }}>
      {/* Y-axis grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ top: padding.top, bottom: padding.bottom }}>
        {[0, 25, 50, 75, 100].map((pct) => (
          <div key={pct} className="border-b border-[var(--border)]" />
        ))}
      </div>

      {/* Chart SVG */}
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        {/* Gradient definition */}
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#chartGradient)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={`${p.x}%`} cy={p.y} r="4" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
            <title>{`${p.label}: ${formatValue(p.value)}`}</title>
          </g>
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-[var(--muted-foreground)]">
        {data.length <= 7 ? (
          data.map((item, index) => (
            <span key={index} className="truncate max-w-[80px] text-center">
              {item.label}
            </span>
          ))
        ) : (
          <>
            <span>{data[0]?.label}</span>
            <span>{data[Math.floor(data.length / 2)]?.label}</span>
            <span>{data[data.length - 1]?.label}</span>
          </>
        )}
      </div>
    </div>
  );
}
