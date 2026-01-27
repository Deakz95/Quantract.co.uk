'use client';

import { useEffect, useState, useMemo } from 'react';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterDropdown, type Filters, type FilterConfig } from "@/components/ui/FilterDropdown";
import { Briefcase, Plus, Clock } from "lucide-react";
import Link from "next/link";

type Job = {
  id: string;
  jobNumber?: string;
  name?: string;
  title?: string;
  status: string;
  startDate?: string;
  createdAt?: string;
  client?: {
    id: string;
    name: string;
    email?: string;
  };
  site?: {
    id: string;
    name: string;
    address?: string;
    address1?: string;
    city?: string;
    postcode?: string;
  };
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "on_hold", label: "On Hold" },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({});

  useEffect(() => {
    fetch('/api/admin/jobs')
      .then(r => r.json())
      .then(j => { setJobs(j.data || j || []); setLoading(false); });
  }, []);

  // Extract unique clients for filter options
  const clientOptions = useMemo(() => {
    const uniqueClients = new Map<string, string>();
    jobs.forEach(job => {
      if (job.client?.name) {
        uniqueClients.set(job.client.name, job.client.name);
      }
    });
    return Array.from(uniqueClients.entries()).map(([name]) => ({
      value: name,
      label: name,
    }));
  }, [jobs]);

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: STATUS_OPTIONS,
    },
    {
      key: "client",
      label: "Client",
      type: "search",
      options: clientOptions,
      placeholder: "Search clients...",
    },
    {
      key: "startDate",
      label: "Start Date",
      type: "daterange",
    },
  ];

  // Apply filters and search
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const jobName = job.name || job.title || '';
        const siteAddress = job.site?.address || job.site?.address1 || '';
        const matchesSearch =
          (job.jobNumber?.toLowerCase().includes(search)) ||
          (jobName.toLowerCase().includes(search)) ||
          (job.client?.name?.toLowerCase().includes(search)) ||
          (siteAddress.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }

      // Status filter (multiselect)
      const statusFilter = filters.status as string[] | undefined;
      if (statusFilter && statusFilter.length > 0) {
        if (!statusFilter.includes(job.status?.toLowerCase())) {
          return false;
        }
      }

      // Client filter
      const clientFilter = filters.client as string | undefined;
      if (clientFilter && job.client?.name !== clientFilter) {
        return false;
      }

      // Start date range filter
      const dateRange = filters.startDate as { from?: string; to?: string } | undefined;
      if (dateRange) {
        if (job.startDate) {
          const date = new Date(job.startDate);
          if (dateRange.from && date < new Date(dateRange.from)) return false;
          if (dateRange.to && date > new Date(dateRange.to + 'T23:59:59')) return false;
        } else if (dateRange.from || dateRange.to) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, searchTerm, filters]);

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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] w-64"
            />
            <FilterDropdown
              filters={filters}
              onApply={setFilters}
              filterConfigs={filterConfigs}
            />
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
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                {jobs.length === 0 ? 'No jobs yet' : 'No jobs match your filters'}
              </h3>
              <p className="text-[var(--muted-foreground)] mb-4">
                {jobs.length === 0
                  ? 'Create your first job to get started'
                  : 'Try adjusting your search or filter criteria'}
              </p>
              {jobs.length === 0 && (
                <Link href="/admin/jobs/new">
                  <Button variant="gradient">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Job
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map(job => (
              <Link key={job.id} href={`/admin/jobs/${job.id}`}>
                <Card variant="interactive" className="h-full">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-white" />
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2 line-clamp-1">{job.name || job.title || 'Untitled Job'}</h3>
                    {(job.site?.address || job.site?.address1) && (
                      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-2">
                        <Briefcase className="w-4 h-4" />
                        <span className="line-clamp-1">{job.site.address || job.site.address1}</span>
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
