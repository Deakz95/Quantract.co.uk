"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TimelineEvent = {
  id: string;
  ts: string;
  type: string;
  title: string;
  subtitle?: string;
};

type CertificateRef = {
  id: string;
  type: string;
  certificateNumber: string | null;
  issuedAt: string | null;
  outcome: string | null;
};

type JobDetail = {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  site: { name: string | null; address: string } | null;
  certificates: CertificateRef[];
  timeline: TimelineEvent[];
};

const STATUS_BADGE: Record<string, BadgeVariant> = {
  completed: "success",
  in_progress: "warning",
  scheduled: "secondary",
  draft: "outline",
  cancelled: "destructive",
};

const EVENT_COLORS: Record<string, string> = {
  job_created: "#6366f1",
  visit: "#2563eb",
  certificate_issued: "#059669",
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

export default function ClientJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/client/jobs/${jobId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d.ok) {
          setJob(d.job);
        } else {
          setError(d.error === "not_found" ? "Job not found" : d.error || "Failed to load job");
        }
      })
      .catch(() => {
        if (mounted) setError("Failed to load job");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [jobId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-[var(--muted)]" />
          <div className="h-40 rounded-xl bg-[var(--muted)]" />
          <div className="h-60 rounded-xl bg-[var(--muted)]" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">{error || "Job not found"}</p>
            <Link href="/client/jobs" className="mt-4 inline-block text-sm font-semibold hover:underline">
              Back to Jobs
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">{job.title}</h1>
          {job.site && (
            <p className="text-sm text-[var(--muted-foreground)]">
              {job.site.name ? `${job.site.name} — ` : ""}
              {job.site.address}
            </p>
          )}
        </div>
        <Link href="/client/jobs" className="text-sm font-semibold text-[var(--foreground)] hover:underline">
          Back
        </Link>
      </div>

      {/* Status + Date */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div>
            <span className="text-xs text-[var(--muted-foreground)]">Status</span>
            <div className="mt-0.5">
              <Badge variant={STATUS_BADGE[job.status] ?? "default"}>
                {job.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
          {job.scheduledAt && (
            <div>
              <span className="text-xs text-[var(--muted-foreground)]">Scheduled</span>
              <div className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
                {formatDate(job.scheduledAt)}
              </div>
            </div>
          )}
          <div>
            <span className="text-xs text-[var(--muted-foreground)]">Created</span>
            <div className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
              {formatDate(job.createdAt)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificates */}
      {job.certificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {job.certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--foreground)]">{cert.type}</span>
                      {cert.certificateNumber && (
                        <span className="text-xs text-[var(--muted-foreground)]">#{cert.certificateNumber}</span>
                      )}
                    </div>
                    {cert.issuedAt && (
                      <div className="text-xs text-[var(--muted-foreground)]">
                        Issued {formatDate(cert.issuedAt)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {cert.outcome && <Badge variant="success">{cert.outcome}</Badge>}
                    <Link href={`/client/certificates/${cert.id}`}>
                      <Button variant="secondary" type="button">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {job.timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0 pl-6">
              {/* Vertical line */}
              <div className="absolute left-2 top-1 bottom-1 w-px bg-[var(--border)]" />

              {job.timeline.map((event) => (
                <div key={event.id} className="relative pb-4">
                  {/* Dot */}
                  <div
                    className="absolute -left-[17px] top-1 h-3 w-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: EVENT_COLORS[event.type] ?? "#94a3b8" }}
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{event.title}</p>
                    {event.subtitle && (
                      <p className="text-xs text-[var(--muted-foreground)]">{event.subtitle}</p>
                    )}
                    <p className="text-xs text-[var(--muted-foreground)]">{formatDate(event.ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
