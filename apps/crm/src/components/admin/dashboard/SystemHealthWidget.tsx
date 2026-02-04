"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, AlertTriangle, CheckCircle, Activity, Zap, Shield } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type HealthData = {
  errorCount24h: number;
  errorStatus: "green" | "amber" | "red";
  activeImpersonations: number;
  webhookHealth: {
    lastWebhookAt: string | null;
    status: "green" | "amber" | "red" | "no_data";
  };
  cronSignals: Record<string, {
    lastActivity: string | null;
    status: "green" | "amber" | "red" | "no_data" | "unknown";
  }>;
  storageBytes: number;
  checkedAt: string;
};

function StatusDot({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-block w-2.5 h-2.5 rounded-full",
      status === "green" && "bg-green-500",
      status === "amber" && "bg-amber-500",
      status === "red" && "bg-red-500",
      (status === "no_data" || status === "unknown") && "bg-gray-400",
    )} />
  );
}

export function SystemHealthWidget() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/system/health");
      const json = await res.json();
      if (json.ok) setData(json.health);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  if (loading && !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" /> System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const overallStatus = data.errorStatus === "red" ? "red"
    : data.webhookHealth.status === "red" ? "red"
    : data.errorStatus === "amber" || data.webhookHealth.status === "amber" ? "amber"
    : "green";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" /> System Health
            <StatusDot status={overallStatus} />
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchHealth} disabled={loading} className="h-7 w-7 p-0">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Error Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {data.errorCount24h === 0 ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className={cn("w-4 h-4", data.errorStatus === "red" ? "text-red-500" : "text-amber-500")} />
            )}
            <span className="text-[var(--foreground)]">Errors (24h)</span>
          </div>
          <Badge variant={data.errorCount24h === 0 ? "success" : "destructive"} className="text-xs">
            {data.errorCount24h}
          </Badge>
        </div>

        {/* Webhook Health */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Zap className={cn("w-4 h-4", data.webhookHealth.status === "green" ? "text-green-500" : data.webhookHealth.status === "amber" ? "text-amber-500" : "text-gray-400")} />
            <span className="text-[var(--foreground)]">Stripe Webhooks</span>
          </div>
          <StatusDot status={data.webhookHealth.status} />
        </div>

        {/* Cron Status */}
        {Object.entries(data.cronSignals).map(([name, signal]) => (
          <div key={name} className="flex items-center justify-between">
            <span className="text-xs text-[var(--muted-foreground)]">
              {name.replace(/([A-Z])/g, " $1").trim()}
            </span>
            <StatusDot status={signal.status} />
          </div>
        ))}

        {/* Active Impersonations */}
        {data.activeImpersonations > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-amber-500" />
              <span className="text-[var(--foreground)]">Active Impersonations</span>
            </div>
            <Badge variant="secondary" className="text-xs">{data.activeImpersonations}</Badge>
          </div>
        )}

        {/* Links */}
        <div className="pt-2 border-t border-[var(--border)]">
          <Link href="/admin/system/failed-jobs" className="text-xs text-[var(--primary)] hover:underline">
            View Failed Jobs
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
