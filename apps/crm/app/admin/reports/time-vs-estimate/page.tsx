"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";

export default function TimeVsEstimatePage() {
  return (
    <AppShell role="admin" title="Time vs Estimate" subtitle="Compare actual time spent against estimated hours">
      <div className="space-y-6">
        <Link href="/admin/reports">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Button>
        </Link>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-6">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">Coming Soon</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-md">
              The Time vs Estimate report is currently under development. You&apos;ll soon be able to
              compare actual hours logged against quoted estimates across all jobs.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
