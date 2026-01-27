"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import {
  ArrowLeft,
  RefreshCcw,
  Activity,
  Phone,
  Mail,
  FileText,
  Calendar,
  Users,
  MessageSquare,
  CheckSquare,
} from "lucide-react";
import { ChartWidget, type ChartDataPoint } from "@/components/admin/reports/ChartWidget";
import { MetricCard } from "@/components/admin/reports/MetricCard";
import { DateRangePicker } from "@/components/admin/reports/DateRangePicker";
import { ExportButton, generateCSV, downloadCSV } from "@/components/admin/reports/ExportButton";

type UserActivity = {
  userId: string;
  name: string;
  count: number;
};

type ActivityData = {
  totalActivities: number;
  byType: Record<string, number>;
  byUser: UserActivity[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
};

const activityTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  NOTE: { label: "Notes", icon: FileText, color: "from-blue-500 to-blue-600" },
  CALL: { label: "Calls", icon: Phone, color: "from-emerald-500 to-teal-500" },
  EMAIL: { label: "Emails", icon: Mail, color: "from-amber-500 to-orange-500" },
  MEETING: { label: "Meetings", icon: Calendar, color: "from-violet-500 to-purple-500" },
  TASK: { label: "Tasks", icon: CheckSquare, color: "from-pink-500 to-rose-500" },
  STAGE_CHANGE: { label: "Stage Changes", icon: Activity, color: "from-cyan-500 to-blue-500" },
};

function getActivityConfig(type: string) {
  return activityTypeConfig[type] || { label: type, icon: MessageSquare, color: "from-gray-500 to-gray-600" };
}

export default function ActivityReportPage() {
  const loadedRef = useRef(false);
  const [data, setData] = useState<ActivityData | null>(null);
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

      const response = await apiRequest<{ ok: boolean; error?: string } & ActivityData>(
        `/api/admin/reports/activity?${params.toString()}`,
        { cache: "no-store" }
      );

      if (!response.ok) throw new Error(response.error || "Failed to load");

      setData({
        totalActivities: response.totalActivities,
        byType: response.byType,
        byUser: response.byUser,
        dateRange: response.dateRange,
      });
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to load activity report");
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

    // Export activity by type
    const typeHeaders = ["Activity Type", "Count"];
    const typeRows = Object.entries(data.byType).map(([type, count]) => [
      getActivityConfig(type).label,
      count,
    ]);

    // Export activity by user
    const userHeaders = ["User", "Activities"];
    const userRows = data.byUser.map((user) => [user.name, user.count]);

    const allHeaders = [...typeHeaders, "", ...userHeaders];
    const maxRows = Math.max(typeRows.length, userRows.length);
    const combinedRows: (string | number)[][] = [];

    for (let i = 0; i < maxRows; i++) {
      combinedRows.push([
        typeRows[i]?.[0] || "",
        typeRows[i]?.[1] || "",
        "",
        userRows[i]?.[0] || "",
        userRows[i]?.[1] || "",
      ]);
    }

    combinedRows.push(["Total", data.totalActivities, "", "", ""]);

    const csv = generateCSV(allHeaders, combinedRows);
    downloadCSV(csv, `activity-report-${startDate.toISOString().split("T")[0]}.csv`);
  };

  // Transform data for charts
  const activityTypeChartData: ChartDataPoint[] = data
    ? Object.entries(data.byType).map(([type, count]) => ({
        label: getActivityConfig(type).label,
        value: count,
      }))
    : [];

  const userChartData: ChartDataPoint[] = data?.byUser.slice(0, 10).map((user) => ({
    label: user.name,
    value: user.count,
    color: "#8b5cf6", // violet
  })) || [];

  // Find top activity types for the metric cards
  const topTypes = data
    ? Object.entries(data.byType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
    : [];

  return (
    <AppShell role="admin" title="Activity Metrics" subtitle="Monitor team activity and engagement">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                title="Total Activities"
                value={data.totalActivities.toString()}
                icon={Activity}
                iconColor="from-blue-500 to-blue-600"
              />
              {topTypes.map(([type, count]) => {
                const config = getActivityConfig(type);
                return (
                  <MetricCard
                    key={type}
                    title={config.label}
                    value={count.toString()}
                    icon={config.icon}
                    iconColor={config.color}
                  />
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartWidget
                title="Activities by Type"
                data={activityTypeChartData}
                type="bar"
                formatValue={(v) => v.toString()}
              />
              <ChartWidget
                title="Top Contributors"
                data={userChartData}
                type="bar"
                formatValue={(v) => v.toString()}
              />
            </div>

            {/* Activity Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Type Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(data.byType).map(([type, count]) => {
                    const config = getActivityConfig(type);
                    const Icon = config.icon;
                    const percentage = data.totalActivities > 0 ? ((count / data.totalActivities) * 100).toFixed(1) : 0;

                    return (
                      <div
                        key={type}
                        className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center mb-3`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-[var(--foreground)]">{count}</div>
                        <div className="text-sm text-[var(--muted-foreground)]">{config.label}</div>
                        <Badge variant="secondary" className="mt-2">
                          {percentage}%
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Team Leaderboard */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--primary)]" />
                  <CardTitle>Team Leaderboard</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {data.byUser.length === 0 ? (
                  <div className="text-center py-8 text-[var(--muted-foreground)]">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No activity recorded for this period</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Rank</th>
                          <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Team Member</th>
                          <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Activities</th>
                          <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byUser.map((user, index) => {
                          const percentage = data.totalActivities > 0 ? ((user.count / data.totalActivities) * 100).toFixed(1) : 0;
                          return (
                            <tr
                              key={user.userId}
                              className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                                index % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]/50"
                              }`}
                            >
                              <td className="py-3 px-4">
                                {index < 3 ? (
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                                    index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : "bg-amber-600"
                                  }`}>
                                    {index + 1}
                                  </span>
                                ) : (
                                  <span className="text-[var(--muted-foreground)]">{index + 1}</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-semibold text-xs">
                                    {user.name
                                      .split(" ")
                                      .map((n) => n[0]?.toUpperCase())
                                      .join("")
                                      .slice(0, 2)}
                                  </div>
                                  <span className="font-medium text-[var(--foreground)]">{user.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-semibold text-[var(--foreground)]">{user.count}</td>
                              <td className="py-3 px-4 text-right text-[var(--muted-foreground)]">{percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
