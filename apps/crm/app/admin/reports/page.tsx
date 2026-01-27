"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, GitBranch, TrendingUp, Activity, Receipt, FileBarChart, Clock } from "lucide-react";

type ReportCard = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

const reports: ReportCard[] = [
  {
    title: "Pipeline Report",
    description: "Visualize your sales funnel and track deals through each stage",
    href: "/admin/reports/pipeline",
    icon: GitBranch,
    color: "from-blue-500 to-blue-600",
  },
  {
    title: "Sales Performance",
    description: "Track won/lost deals, conversion rates, and revenue trends",
    href: "/admin/reports/sales",
    icon: TrendingUp,
    color: "from-emerald-500 to-teal-500",
  },
  {
    title: "Activity Metrics",
    description: "Monitor team activity including calls, notes, and meetings",
    href: "/admin/reports/activity",
    icon: Activity,
    color: "from-violet-500 to-purple-500",
  },
  {
    title: "Profitability",
    description: "Track job margins and identify at-risk projects",
    href: "/admin/reports/profitability",
    icon: Receipt,
    color: "from-amber-500 to-orange-500",
  },
  {
    title: "Revenue Report",
    description: "Analyze revenue trends and forecasts",
    href: "/admin/reports/revenue",
    icon: FileBarChart,
    color: "from-pink-500 to-rose-500",
  },
  {
    title: "Time vs Estimate",
    description: "Compare actual time spent vs estimated hours",
    href: "/admin/reports/time-vs-estimate",
    icon: Clock,
    color: "from-cyan-500 to-blue-500",
  },
];

export default function ReportsPage() {
  return (
    <AppShell role="admin" title="Reports" subtitle="Analyze your business performance with detailed insights">
      <div className="space-y-6">
        {/* Quick Stats Banner */}
        <Card className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white border-0">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Business Intelligence Hub</h3>
                <p className="text-white/80 text-sm mt-1">
                  Access detailed reports and analytics to make data-driven decisions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Link key={report.href} href={report.href}>
              <Card variant="interactive" className="h-full group">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${report.color} flex items-center justify-center shadow-lg`}
                    >
                      <report.icon className="w-6 h-6 text-white" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription className="mt-2">{report.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
