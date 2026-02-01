'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  CheckCircle,
  FileText,
  Clock,
  Shield,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AttentionItem = {
  id: string;
  icon: string;
  message: string;
  age: string;
  type: string;
  ctaLabel: string;
  ctaHref: string;
};

const ICON_MAP: Record<string, LucideIcon> = {
  'file-text': FileText,
  'clock': Clock,
  'shield': Shield,
  'alert-circle': AlertCircle,
  'briefcase': Briefcase,
};

export default function NeedsAttention() {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/admin/dashboard/attention');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setItems((json.items ?? []).slice(0, 6));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Needs Attention</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchData}
          disabled={loading}
          className="h-8 w-8 text-slate-400 hover:text-slate-600"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-slate-400">Failed to load attention items.</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              className="mt-2 text-xs text-slate-500"
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center py-6 gap-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <p className="text-sm text-slate-400">You&apos;re all caught up</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => {
              const IconComponent = ICON_MAP[item.icon] ?? AlertCircle;
              const dotColor = item.type === 'invoice_overdue' ? 'bg-orange-500' : 'bg-amber-500';

              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full ${dotColor} flex items-center justify-center shrink-0`}
                  >
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{item.message}</p>
                    <p className="text-xs text-slate-400">{item.age}</p>
                  </div>
                  <Link href={item.ctaHref}>
                    <Button variant="ghost" size="sm" className="text-xs shrink-0">
                      {item.ctaLabel}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
