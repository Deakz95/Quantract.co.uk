"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import { ArrowLeft, RefreshCcw, GitBranch, DollarSign, Target } from "lucide-react";
import { FunnelChart, type FunnelStage } from "@/components/admin/reports/FunnelChart";
import { MetricCard } from "@/components/admin/reports/MetricCard";
import { DateRangePicker } from "@/components/admin/reports/DateRangePicker";
import { ExportButton, generateCSV, downloadCSV } from "@/components/admin/reports/ExportButton";

type PipelineData = {
  stages: FunnelStage[];
  totalValue: number;
  weightedValue: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
};

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(1)}K`;
  }
  return `£${value.toFixed(0)}`;
}

export default function PipelineReportPage() {
  const loadedRef = useRef(false);
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

      const response = await apiRequest<{ ok: boolean; error?: string } & PipelineData>(
        `/api/admin/reports/pipeline?${params.toString()}`,
        { cache: "no-store" }
      );

      if (!response.ok) throw new Error(response.error || "Failed to load");

      setData({
        stages: response.stages,
        totalValue: response.totalValue,
        weightedValue: response.weightedValue,
        dateRange: response.dateRange,
      });
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to load pipeline report");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

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
    const headers = ["Stage", "Count", "Value", "Probability (%)"];
    const rows = data.stages.map((stage) => [
      stage.name,
      stage.count,
      stage.value,
      stage.probability ?? 0,
    ]);
    rows.push(["Total", "", data.totalValue, ""]);
    rows.push(["Weighted Value", "", data.weightedValue, ""]);

    const csv = generateCSV(headers, rows);
    downloadCSV(csv, `pipeline-report-${startDate.toISOString().split("T")[0]}.csv`);
  };

  const totalDeals = data?.stages.reduce((sum, s) => sum + s.count, 0) || 0;

  return (
    <AppShell role="admin" title="Pipeline Report" subtitle="Visualize your sales funnel and deal progression">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin/reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reports
            </Button>
          </Link>

          <div className="flex items-center gap-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <LoadingSkeleton className="h-12 w-12 rounded-xl" />
                    <LoadingSkeleton className="mt-4 h-8 w-20" />
                    <LoadingSkeleton className="mt-2 h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="p-6">
                <LoadingSkeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : error ? (
          <ErrorState title="Unable to load report" description={error} onRetry={load} />
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                title="Total Pipeline Value"
                value={formatCurrency(data.totalValue)}
                icon={DollarSign}
                iconColor="from-blue-500 to-blue-600"
              />
              <MetricCard
                title="Weighted Value"
                value={formatCurrency(data.weightedValue)}
                icon={Target}
                iconColor="from-emerald-500 to-teal-500"
              />
              <MetricCard
                title="Total Deals"
                value={totalDeals.toString()}
                icon={GitBranch}
                iconColor="from-violet-500 to-purple-500"
              />
            </div>

            {/* Funnel Chart */}
            <FunnelChart
              title="Deal Pipeline"
              stages={data.stages}
              formatValue={formatCurrency}
            />

            {/* Stages Table */}
            <Card>
              <CardHeader>
                <CardTitle>Stage Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Stage</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Deals</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Value</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Probability</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Weighted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.stages.map((stage, index) => (
                        <tr
                          key={index}
                          className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                            index % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]/50"
                          }`}
                        >
                          <td className="py-3 px-4 font-medium text-[var(--foreground)]">{stage.name}</td>
                          <td className="py-3 px-4 text-right text-[var(--foreground)]">{stage.count}</td>
                          <td className="py-3 px-4 text-right text-[var(--foreground)]">{formatCurrency(stage.value)}</td>
                          <td className="py-3 px-4 text-right text-[var(--muted-foreground)]">{stage.probability ?? 0}%</td>
                          <td className="py-3 px-4 text-right text-[var(--foreground)]">
                            {formatCurrency((stage.value * (stage.probability ?? 0)) / 100)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[var(--muted)]">
                        <td className="py-3 px-4 font-bold text-[var(--foreground)]">Total</td>
                        <td className="py-3 px-4 text-right font-bold text-[var(--foreground)]">{totalDeals}</td>
                        <td className="py-3 px-4 text-right font-bold text-[var(--foreground)]">{formatCurrency(data.totalValue)}</td>
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4 text-right font-bold text-[var(--foreground)]">{formatCurrency(data.weightedValue)}</td>
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
