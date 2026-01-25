"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Job = {
  id: string;
  quoteId: string;
  title?: string;
  clientName: string;
  siteAddress?: string;
  status: "new" | "scheduled" | "in_progress" | "completed";
  scheduledAtISO?: string;
};

const CACHE_KEY = "qt_engineer_jobs_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

export default function EngineerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [offline, setOffline] = useState(false);

  // Offline caching strategy: always try the live API first, then fall back to a short-lived
  // localStorage snapshot so engineers can still see their last known assignments when offline.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/engineer/jobs", { cache: "no-store" });
        const d = await r.json().catch(() => ({}));
        if (!cancelled && r.ok) {
          const next = Array.isArray(d.jobs) ? d.jobs : [];
          setJobs(next);
          setOffline(false);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), jobs: next }));
        }
      } catch {
        if (cancelled) return;
        setOffline(true);
        try {
          const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
          if (cached && Array.isArray(cached.jobs) && typeof cached.at === "number") {
            if (Date.now() - cached.at <= CACHE_TTL_MS) {
              setJobs(cached.jobs);
            }
          }
        } catch {
          // ignore
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Shell role="engineer" title="My Jobs" subtitle={offline ? "Offline mode - showing cached data" : ""}>
      <div className="space-y-3">
        {jobs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nothing assigned yet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-[var(--muted-foreground)]">Once you’re scheduled onto a job, it will appear here.</div>
            </CardContent>
          </Card>
        ) : null}

        {jobs.map((j) => (
          <Link key={j.id} href={`/engineer/jobs/${j.id}`} className="block">
            <Card>
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold">{j.title || "Job"}</div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">{j.clientName}</div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">{j.siteAddress || "—"}</div>
                    {j.scheduledAtISO ? (
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">Scheduled: {new Date(j.scheduledAtISO).toLocaleString("en-GB")}</div>
                    ) : null}
                  </div>
                  <Badge>{j.status.replace("_", " ")}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
