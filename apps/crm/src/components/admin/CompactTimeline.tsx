'use client';

import { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
  FileText,
  Shield,
  Receipt,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type TimelineEvent = {
  id: string;
  entityType: string;
  action: string;
  description: string;
  timestamp: string;
};

const ENTITY_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  job: { icon: Briefcase, color: "text-orange-500" },
  quote: { icon: Receipt, color: "text-purple-500" },
  invoice: { icon: FileText, color: "text-blue-500" },
  certificate: { icon: Shield, color: "text-green-500" },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function CompactTimeline({
  jobId,
  clientId,
}: {
  jobId?: string;
  clientId?: string;
}) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (jobId) params.set("jobId", jobId);
      if (clientId) params.set("clientId", clientId);
      const res = await fetch(`/api/admin/timeline?${params}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setEvents(json.items ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [jobId, clientId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 animate-pulse">
            <div className="w-5 h-5 rounded-full bg-slate-200" />
            <div className="flex-1 h-3 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-xs text-slate-400">No recent activity</p>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const entity = ENTITY_ICONS[event.entityType] ?? { icon: Clock, color: "text-slate-400" };
        const Icon = entity.icon;

        return (
          <div key={event.id} className="flex items-start gap-2">
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${entity.color}`} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-600 truncate">{event.description}</p>
              <p className="text-[10px] text-slate-400">{relativeTime(event.timestamp)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
