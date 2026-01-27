"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export type MetricCardProps = {
  title: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  iconColor?: string;
};

export function MetricCard({ title, value, change, icon: Icon, iconColor = "from-blue-500 to-blue-600" }: MetricCardProps) {
  const hasChange = typeof change === "number";
  const isPositive = hasChange && change >= 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          {Icon && (
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
          {hasChange && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              isPositive
                ? "bg-[var(--success)]/10 text-[var(--success)]"
                : "bg-[var(--error)]/10 text-[var(--error)]"
            }`}>
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="text-3xl font-bold text-[var(--foreground)]">{value}</div>
          <div className="text-sm font-medium text-[var(--muted-foreground)] mt-1">{title}</div>
        </div>
      </CardContent>
    </Card>
  );
}
