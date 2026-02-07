"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileBarChart } from "lucide-react";

export default function RevenueReportPage() {
  return (
    <AppShell role="admin" title="Revenue Report" subtitle="Analyse revenue trends and forecasts">
      <div className="space-y-6">
        <Link href="/admin/reports">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Button>
        </Link>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-6">
              <FileBarChart className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">Coming Soon</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-md">
              The Revenue Report is currently under development. You&apos;ll soon be able to
              analyse revenue trends, compare periods, and generate forecasts.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
