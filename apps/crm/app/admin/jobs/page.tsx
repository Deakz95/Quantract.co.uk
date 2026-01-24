'use client';

import { useEffect, useState } from 'react';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus, Clock } from "lucide-react";
import Link from "next/link";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/jobs')
      .then(r => r.json())
      .then(j => { setJobs(j.data || []); setLoading(false); });
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      completed: "success",
      in_progress: "warning",
      active: "warning",
      scheduled: "secondary",
      pending: "secondary",
      cancelled: "destructive",
      on_hold: "destructive",
    };
    return <Badge variant={variants[status?.toLowerCase()] || "secondary"}>{status || 'Pending'}</Badge>;
  };

  return (
    <AppShell role="admin" title="Jobs" subtitle="Manage and track all your jobs">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search jobs..."
              className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] w-64"
            />
            <Button variant="secondary" size="sm">
              Filter
            </Button>
          </div>
          <Link href="/admin/jobs/new">
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          </Link>
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No jobs yet</h3>
              <p className="text-[var(--muted-foreground)] mb-4">Create your first job to get started</p>
              <Link href="/admin/jobs/new">
                <Button variant="gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Job
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map(job => (
              <Link key={job.id} href={`/admin/jobs/${job.id}`}>
                <Card variant="interactive" className="h-full">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-white" />
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2 line-clamp-1">{job.name || 'Untitled Job'}</h3>
                    {job.site?.address && (
                      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-2">
                        <Briefcase className="w-4 h-4" />
                        <span className="line-clamp-1">{job.site.address}</span>
                      </div>
                    )}
                    {job.startDate && (
                      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(job.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    )}
                    {job.client?.name && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)]">
                        <span className="text-xs text-[var(--muted-foreground)]">Client:</span>
                        <span className="text-sm font-medium text-[var(--foreground)] ml-2">{job.client.name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
