'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterDropdown, type Filters, type FilterConfig } from "@/components/ui/FilterDropdown";
import { DataTable, BulkActionBar, formatRelativeTime, type Column, type Action, type SortDirection } from "@/components/ui/DataTable";
import { TableSkeletonInline } from "@/components/ui/TableSkeleton";
import { deleteWithMessage, bulkDeleteWithSummary } from "@/lib/http/deleteWithMessage";
import { undoDelete, bulkUndoAll } from "@/lib/http/undoDelete";
import { CardGridSkeleton } from "@/components/ui/CardSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { Briefcase, Plus, Clock, SquarePen, Copy, Trash2, AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
  jobNumber?: string;
  name?: string;
  title?: string;
  description?: string;
  notes?: string;
  status: string;
  startDate?: string;
  createdAt?: string;
  updatedAt?: string;
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
  const router = useRouter();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [healthFlags, setHealthFlags] = useState<Record<string, { hasInvoice: boolean; hasOpenSnags: boolean; hasMissingTimesheet: boolean }>>({});

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/jobs');
      const json = await response.json();

      // API returns array directly on success, or { error: "..." } on failure
      if (!response.ok || json.error) {
        toast({ title: "Error", description: json.error || "Failed to load jobs", variant: "destructive" });
        setJobs([]);
        return;
      }

      // Ensure we always set an array (defensive coding)
      const jobsArray = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
      setJobs(jobsArray);
    } catch {
      toast({ title: "Error", description: "Failed to load jobs", variant: "destructive" });
      setJobs([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // toast is intentionally excluded - it's a side-effect function that shouldn't trigger re-fetching

  useEffect(() => {
    loadJobs();
    fetch('/api/admin/jobs/health-flags')
      .then(r => r.json())
      .then(json => { if (json.ok) setHealthFlags(json.flags); })
      .catch(() => {});
  }, [loadJobs]);

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
    let result = jobs.filter(job => {
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

    // Apply sorting
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aVal: unknown;
        let bVal: unknown;

        // Handle nested properties
        if (sortKey === 'clientName') {
          aVal = a.client?.name;
          bVal = b.client?.name;
        } else if (sortKey === 'jobName') {
          aVal = a.name || a.title;
          bVal = b.name || b.title;
        } else {
          aVal = (a as Record<string, unknown>)[sortKey];
          bVal = (b as Record<string, unknown>)[sortKey];
        }

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [jobs, searchTerm, filters, sortKey, sortDirection]);

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

  const handleSort = (key: string, direction: SortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleEdit = (job: Job) => {
    router.push(`/admin/jobs/${job.id}`);
  };

  const handleDuplicate = async (job: Job) => {
    try {
      const response = await fetch(`/api/admin/jobs/${job.id}/duplicate`, {
        method: 'POST',
      });
      if (response.ok) {
        toast({ title: "Success", description: "Job duplicated", variant: "success" });
        loadJobs();
      } else {
        throw new Error('Failed to duplicate');
      }
    } catch {
      toast({ title: "Error", description: "Failed to duplicate job", variant: "destructive" });
    }
  };

  const handleDelete = async (job: Job) => {
    try {
      const result = await deleteWithMessage(`/api/admin/jobs/${job.id}`);
      toast({
        title: "Job deleted", description: "Job removed", variant: "success",
        duration: result.undo ? 30_000 : undefined,
        action: result.undo ? { label: "Undo", onClick: () => { undoDelete(result.undo!).then(() => { toast({ title: "Restored", description: "Job has been restored", variant: "success" }); loadJobs(); }).catch(() => toast({ title: "Undo expired", description: "The undo window has closed", variant: "destructive" })); } } : undefined,
      });
      loadJobs();
      setSelectedIds(ids => ids.filter(id => id !== job.id));
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to delete job", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const r = await bulkDeleteWithSummary(selectedIds, (id) => `/api/admin/jobs/${id}`);
      if (r.deleted > 0) {
        const label = `${r.deleted} job${r.deleted === 1 ? "" : "s"} deleted`;
        toast({
          title: "Jobs deleted", description: label, variant: "success",
          duration: r.undos.length > 0 ? 30_000 : undefined,
          action: r.undos.length > 0 ? {
            label: "Undo",
            onClick: async () => {
              const result = await bulkUndoAll(r.undos);
              if (result.restored === result.total) {
                toast({ title: "Restored", description: `Restored ${result.restored} job${result.restored === 1 ? "" : "s"}.`, variant: "success" });
              } else if (result.restored > 0) {
                toast({ title: "Partially restored", description: `Restored ${result.restored}/${result.total}. ${result.failed} could not be restored (expired).`, type: "warning" });
              } else {
                toast({ title: "Undo expired", description: "The undo window has closed", variant: "destructive" });
              }
              if (result.restored > 0) loadJobs();
            },
          } : undefined,
        });
      }
      if (r.blocked > 0) toast({ title: "Error", description: r.messages[0] || `${r.blocked} could not be deleted (linked records).`, variant: "destructive" });
      loadJobs();
      if (r.blocked === 0) setSelectedIds([]);
    } catch {
      toast({ title: "Error", description: "Failed to delete jobs", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const columns: Column<Job>[] = [
    {
      key: 'jobNumber',
      label: 'Job #',
      sortable: true,
      render: (job) => (
        <Link href={`/admin/jobs/${job.id}`} className="text-[var(--primary)] font-medium hover:underline">
          {job.jobNumber || `J-${job.id?.slice(0, 8)}`}
        </Link>
      ),
    },
    {
      key: 'jobName',
      label: 'Name',
      sortable: true,
      render: (job) => {
        const flags = healthFlags[job.id];
        const warnings: string[] = [];
        if (flags && !flags.hasInvoice && job.status === 'completed') warnings.push('No invoice');
        if (flags?.hasOpenSnags) warnings.push('Open snags');
        if (flags?.hasMissingTimesheet) warnings.push('Missing timesheet');
        return (
          <span className="text-[var(--foreground)] font-medium inline-flex items-center gap-1.5">
            {job.name || job.title || 'Untitled Job'}
            {warnings.length > 0 && (
              <span title={warnings.join(' · ')} className="inline-flex">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: 'description',
      label: 'Description',
      render: (job) => {
        const desc = job.description || job.notes || '';
        return (
          <span className="text-[var(--muted-foreground)] text-xs line-clamp-1" title={desc}>
            {desc ? (desc.length > 60 ? desc.slice(0, 57) + '...' : desc) : '-'}
          </span>
        );
      },
    },
    {
      key: 'clientName',
      label: 'Client',
      sortable: true,
      render: (job) => job.client?.id ? (
        <Link href={`/admin/clients/${job.client.id}`} className="text-[var(--primary)] hover:underline">{job.client.name || '-'}</Link>
      ) : (
        <span className="text-[var(--foreground)]">{job.client?.name || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (job) => getStatusBadge(job.status),
    },
    {
      key: 'startDate',
      label: 'Start Date',
      sortable: true,
      render: (job) => (
        <span className="text-[var(--muted-foreground)]">
          {job.startDate ? new Date(job.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      sortable: true,
      render: (job) => (
        <span className="text-[var(--muted-foreground)]">
          {formatRelativeTime(job.updatedAt || job.createdAt)}
        </span>
      ),
    },
  ];

  const actions: Action<Job>[] = [
    {
      label: 'Edit',
      onClick: handleEdit,
      icon: <SquarePen className="w-4 h-4" />,
    },
    {
      label: 'Duplicate',
      onClick: handleDuplicate,
      icon: <Copy className="w-4 h-4" />,
    },
    {
      label: 'Delete',
      onClick: handleDelete,
      variant: 'danger',
      icon: <Trash2 className="w-4 h-4" />,
    },
  ];

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
            {/* View mode toggle */}
            <div className="hidden sm:flex border border-[var(--border)] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-[var(--foreground)]'}`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-[var(--foreground)]'}`}
              >
                Grid
              </button>
            </div>
          </div>
          <Link href="/admin/jobs/new">
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          </Link>
        </div>

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedIds.length}
          onDelete={() => setBulkDeleteOpen(true)}
          onClearSelection={() => setSelectedIds([])}
          deleteLabel="Delete selected"
        />

        {/* Jobs Content */}
        {loading ? (
          viewMode === 'table' ? (
            <Card>
              <CardContent className="p-0">
                <TableSkeletonInline columns={6} rows={8} />
              </CardContent>
            </Card>
          ) : (
            <CardGridSkeleton count={6} />
          )
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={Briefcase}
                title="No jobs yet"
                description="Jobs represent work to be completed for clients. Schedule, assign, and track jobs from start to completion."
                features={[
                  "Schedule jobs with start dates and assign to engineers",
                  "Track job progress with checklists and status updates",
                  "Link jobs to quotes and generate invoices on completion"
                ]}
                primaryAction={{ label: "Create your first job", href: "/admin/jobs/new" }}
                secondaryAction={{ label: "Learn more", href: "/admin/help/jobs" }}
              />
            </CardContent>
          </Card>
        ) : filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                No jobs match your filters
              </h3>
              <p className="text-[var(--muted-foreground)] mb-4">
                Try adjusting your search or filter criteria
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                data={filteredJobs}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                actions={actions}
                getRowId={(row) => row.id}
                onRowClick={(row) => router.push(`/admin/jobs/${row.id}`)}
              />
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

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.length} job${selectedIds.length === 1 ? '' : 's'}?`}
        description="Jobs will be removed from view. You can undo this action for a short time."
        confirmLabel="Delete"
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        busy={bulkDeleting}
      />
    </AppShell>
  );
}
