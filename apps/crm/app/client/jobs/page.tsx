"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

type Job = {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  site: { name: string | null; address: string } | null;
};

const STATUS_BADGE: Record<string, BadgeVariant> = {
  completed: "success",
  in_progress: "warning",
  scheduled: "secondary",
  draft: "outline",
  cancelled: "destructive",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ClientJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/client/jobs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d.ok) {
          setJobs(d.jobs || []);
        } else {
          setError(d.error || "Failed to load jobs");
        }
      })
      .catch(() => {
        if (mounted) setError("Failed to load jobs");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Jobs</CardTitle>
            <Link
              href="/client"
              className="text-sm font-semibold text-[var(--foreground)] hover:underline"
            >
              Back
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 rounded-xl bg-[var(--muted)]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">
              No jobs found.
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/client/jobs/${job.id}`}
                  className="block rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 hover:bg-[var(--muted)] transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {job.title}
                        </span>
                        <Badge variant={STATUS_BADGE[job.status] ?? "default"}>
                          {job.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      {job.site && (
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {job.site.name ? `${job.site.name} — ` : ""}
                          {job.site.address}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                      {job.scheduledAt
                        ? formatDate(job.scheduledAt)
                        : formatDate(job.createdAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
