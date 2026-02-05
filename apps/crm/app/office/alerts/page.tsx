"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCcw,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

type Alert = {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  link: string;
  entityId?: string;
};

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "destructive" as const,
  },
  warning: {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "warning" as const,
  },
  info: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "secondary" as const,
  },
};

export default function OfficeAlertsPage() {
  const loadedRef = useRef(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [counts, setCounts] = useState({ critical: 0, warning: 0, info: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/office/alerts", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load");
      setAlerts(json.alerts || []);
      setCounts(json.counts || { critical: 0, warning: 0, info: 0, total: 0 });
    } catch (e: any) {
      setError(e.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      load();
    }
  }, [load]);

  return (
    <AppShell role="office" title="Today's Problems" subtitle="Issues requiring attention">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {counts.critical > 0 && (
              <Badge variant="destructive">{counts.critical} Critical</Badge>
            )}
            {counts.warning > 0 && (
              <Badge variant="warning">{counts.warning} Warning</Badge>
            )}
            {counts.info > 0 && (
              <Badge variant="secondary">{counts.info} Info</Badge>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <LoadingSkeleton className="h-4 w-40 mb-2" />
                  <LoadingSkeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <p className="text-sm text-[var(--foreground)]">{error}</p>
              <Button variant="secondary" size="sm" onClick={load} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <div className="text-lg font-semibold text-[var(--foreground)]">All Clear</div>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">No problems detected today. Nice work!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity];
              const Icon = config.icon;
              return (
                <Card key={alert.id} className={`border ${config.border}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${config.bg} ${config.color} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={config.badge} className="text-[10px]">{alert.severity}</Badge>
                          <span className="text-sm font-semibold text-[var(--foreground)]">{alert.title}</span>
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)]">{alert.description}</p>
                      </div>
                      <Link
                        href={alert.link}
                        className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        Fix <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
