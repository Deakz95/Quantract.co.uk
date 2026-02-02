"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import { ArrowLeft, RefreshCcw, TrendingUp, TrendingDown, PoundSterling, Target, Percent, Award } from "lucide-react";
import { ChartWidget, type ChartDataPoint } from "@/components/admin/reports/ChartWidget";
import { MetricCard } from "@/components/admin/reports/MetricCard";
import { DateRangePicker } from "@/components/admin/reports/DateRangePicker";
import { ExportButton, generateCSV, downloadCSV } from "@/components/admin/reports/ExportButton";

type DataPoint = {
  date: string;
  won: number;
  lost: number;
  value: number;
};

type SalesData = {
  wonDeals: number;
  lostDeals: number;
  totalValue: number;
  avgDealSize: number;
  conversionRate: number;
  dataPoints: DataPoint[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
};

type GroupBy = "day" | "week" | "month";

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(1)}K`;
  }
  return `£${value.toFixed(0)}`;
}

function formatDateLabel(dateStr: string, groupBy: GroupBy): string {
  const date = new Date(dateStr);
  switch (groupBy) {
    case "day":
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    case "week":
      return `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString("en-GB", { month: "short" })}`;
    case "month":
      return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    default:
      return dateStr;
  }
}

export default function SalesReportPage() {
  const loadedRef = useRef(false);
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("startDate", startDate.toISOString());
      params.set("endDate", endDate.toISOString());
      params.set("groupBy", groupBy);

      const response = await apiRequest<{ ok: boolean; error?: string } & SalesData>(
        `/api/admin/reports/sales?${params.toString()}`,
        { cache: "no-store" }
      );

      if (!response.ok) throw new Error(response.error || "Failed to load");

      setData({
        wonDeals: response.wonDeals,
        lostDeals: response.lostDeals,
        totalValue: response.totalValue,
        avgDealSize: response.avgDealSize,
        conversionRate: response.conversionRate,
        dataPoints: response.dataPoints,
        dateRange: response.dateRange,
      });
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to load sales report");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, groupBy]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, []);

  const handleDateChange = (newStart: Date, newEnd: Date) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleApplyFilters = () => {
    load();
  };

  const handleExport = () => {
    if (!data) return;
    const headers = ["Date", "Won Deals", "Lost Deals", "Revenue"];
    const rows = data.dataPoints.map((point) => [
      point.date,
      point.won,
      point.lost,
      point.value,
    ]);
    rows.push(["Summary", "", "", ""]);
    rows.push(["Total Won", data.wonDeals, "", ""]);
    rows.push(["Total Lost", data.lostDeals, "", ""]);
    rows.push(["Total Revenue", "", "", data.totalValue]);
    rows.push(["Avg Deal Size", "", "", data.avgDealSize]);
    rows.push(["Conversion Rate", "", "", `${data.conversionRate.toFixed(1)}%`]);

    const csv = generateCSV(headers, rows);
    downloadCSV(csv, `sales-report-${startDate.toISOString().split("T")[0]}.csv`);
  };

  // Transform data for charts
  const revenueChartData: ChartDataPoint[] = data?.dataPoints.map((p) => ({
    label: formatDateLabel(p.date, groupBy),
    value: p.value,
  })) || [];

  const wonLostChartData: ChartDataPoint[] = data?.dataPoints.map((p) => ({
    label: formatDateLabel(p.date, groupBy),
    value: p.won,
    color: "#10b981", // green
  })) || [];

  return (
    <AppShell role="admin" title="Sales Performance" subtitle="Track revenue, conversion rates, and deal outcomes">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin/reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reports
            </Button>
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
            <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
            <Button variant="secondary" size="sm" onClick={handleApplyFilters} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Apply
            </Button>
            <ExportButton onExport={handleExport} disabled={loading || !data} />
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <LoadingSkeleton className="h-12 w-12 rounded-xl" />
                    <LoadingSkeleton className="mt-4 h-8 w-20" />
                    <LoadingSkeleton className="mt-2 h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <LoadingSkeleton className="h-64 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <LoadingSkeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : error ? (
          <ErrorState title="Unable to load report" description={error} onRetry={load} />
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Won Deals"
                value={data.wonDeals.toString()}
                icon={TrendingUp}
                iconColor="from-emerald-500 to-teal-500"
              />
              <MetricCard
                title="Lost Deals"
                value={data.lostDeals.toString()}
                icon={TrendingDown}
                iconColor="from-red-500 to-rose-500"
              />
              <MetricCard
                title="Total Revenue"
                value={formatCurrency(data.totalValue)}
                icon={PoundSterling}
                iconColor="from-blue-500 to-blue-600"
              />
              <MetricCard
                title="Conversion Rate"
                value={`${data.conversionRate.toFixed(1)}%`}
                icon={Percent}
                iconColor="from-violet-500 to-purple-500"
              />
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricCard
                title="Average Deal Size"
                value={formatCurrency(data.avgDealSize)}
                icon={Target}
                iconColor="from-amber-500 to-orange-500"
              />
              <MetricCard
                title="Total Closed Deals"
                value={(data.wonDeals + data.lostDeals).toString()}
                icon={Award}
                iconColor="from-pink-500 to-rose-500"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartWidget
                title="Revenue Over Time"
                data={revenueChartData}
                type="line"
                formatValue={formatCurrency}
              />
              <ChartWidget
                title="Won Deals Over Time"
                data={wonLostChartData}
                type="bar"
                formatValue={(v) => v.toString()}
              />
            </div>

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Period Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Period</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Won</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Lost</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Revenue</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dataPoints.map((point, index) => {
                        const total = point.won + point.lost;
                        const winRate = total > 0 ? (point.won / total) * 100 : 0;
                        return (
                          <tr
                            key={index}
                            className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                              index % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]/50"
                            }`}
                          >
                            <td className="py-3 px-4 font-medium text-[var(--foreground)]">
                              {formatDateLabel(point.date, groupBy)}
                            </td>
                            <td className="py-3 px-4 text-right text-[var(--success)]">{point.won}</td>
                            <td className="py-3 px-4 text-right text-[var(--error)]">{point.lost}</td>
                            <td className="py-3 px-4 text-right text-[var(--foreground)]">{formatCurrency(point.value)}</td>
                            <td className="py-3 px-4 text-right text-[var(--muted-foreground)]">{winRate.toFixed(0)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[var(--muted)]">
                        <td className="py-3 px-4 font-bold text-[var(--foreground)]">Total</td>
                        <td className="py-3 px-4 text-right font-bold text-[var(--success)]">{data.wonDeals}</td>
                        <td className="py-3 px-4 text-right font-bold text-[var(--error)]">{data.lostDeals}</td>
                        <td className="py-3 px-4 text-right font-bold text-[var(--foreground)]">{formatCurrency(data.totalValue)}</td>
                        <td className="py-3 px-4 text-right font-bold text-[var(--muted-foreground)]">{data.conversionRate.toFixed(0)}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
