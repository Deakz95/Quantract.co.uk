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
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { FileText, Plus, SquarePen, Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Quote = {
  id: string;
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  clientId?: string;
  siteName?: string;
  total: number;
  status: string;
  lastSentAt?: string;
  acceptedAt?: string;
  updatedAt?: string;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

export default function QuotesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/quotes/summary');
      const json = await response.json();

      // Handle API errors
      if (!response.ok || json.error) {
        toast({ title: "Error", description: json.error || "Failed to load quotes", variant: "destructive" });
        setItems([]);
        return;
      }

      // Ensure we always have an array (defensive coding)
      const data = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      // Normalize items to have consistent id field
      setItems(data.map((q: Quote & { quoteId?: string }) => ({
        ...q,
        id: q.id || q.quoteId,
      })));
    } catch {
      toast({ title: "Error", description: "Failed to load quotes", variant: "destructive" });
      setItems([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // toast is intentionally excluded - it's a side-effect function that shouldn't trigger re-fetching

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  // Extract unique clients for filter options
  const clientOptions = useMemo(() => {
    const uniqueClients = new Map<string, string>();
    items.forEach(q => {
      if (q.clientName) {
        uniqueClients.set(q.clientName, q.clientName);
      }
    });
    return Array.from(uniqueClients.entries()).map(([name]) => ({
      value: name,
      label: name,
    }));
  }, [items]);

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
      key: "dateRange",
      label: "Date Range",
      type: "daterange",
    },
  ];

  // Apply filters and search
  const filteredItems = useMemo(() => {
    let result = items.filter(quote => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          (quote.quoteNumber?.toLowerCase().includes(search)) ||
          (quote.clientName?.toLowerCase().includes(search)) ||
          (quote.siteName?.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }

      // Status filter (multiselect)
      const statusFilter = filters.status as string[] | undefined;
      if (statusFilter && statusFilter.length > 0) {
        if (!statusFilter.includes(quote.status?.toLowerCase())) {
          return false;
        }
      }

      // Client filter
      const clientFilter = filters.client as string | undefined;
      if (clientFilter && quote.clientName !== clientFilter) {
        return false;
      }

      // Date range filter (based on acceptedAt or lastSentAt)
      const dateRange = filters.dateRange as { from?: string; to?: string } | undefined;
      if (dateRange) {
        const quoteDate = quote.acceptedAt || quote.lastSentAt;
        if (quoteDate) {
          const date = new Date(quoteDate);
          if (dateRange.from && date < new Date(dateRange.from)) return false;
          if (dateRange.to && date > new Date(dateRange.to + 'T23:59:59')) return false;
        } else if (dateRange.from || dateRange.to) {
          // If no date on quote but filter is set, exclude it
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];

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
  }, [items, searchTerm, filters, sortKey, sortDirection]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      accepted: "success",
      sent: "warning",
      pending: "warning",
      draft: "secondary",
      rejected: "destructive",
      expired: "destructive",
    };
    return <Badge variant={variants[status?.toLowerCase()] || "secondary"}>{status || 'Draft'}</Badge>;
  };

  const handleSort = (key: string, direction: SortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleEdit = (quote: Quote) => {
    router.push(`/admin/quotes/${quote.id || quote.quoteId}`);
  };

  const handleDuplicate = async (quote: Quote) => {
    try {
      const response = await fetch(`/api/admin/quotes/${quote.id || quote.quoteId}/duplicate`, {
        method: 'POST',
      });
      if (response.ok) {
        toast({ title: "Success", description: "Quote duplicated", variant: "success" });
        loadQuotes();
      } else {
        throw new Error('Failed to duplicate');
      }
    } catch {
      toast({ title: "Error", description: "Failed to duplicate quote", variant: "destructive" });
    }
  };

  const handleDelete = async (quote: Quote) => {
    const qid = quote.id || quote.quoteId;
    try {
      const result = await deleteWithMessage(`/api/admin/quotes/${qid}`);
      toast({
        title: "Quote deleted", description: "Quote removed", variant: "success",
        duration: result.undo ? 30_000 : undefined,
        action: result.undo ? { label: "Undo", onClick: () => { undoDelete(result.undo!).then(() => { toast({ title: "Restored", description: "Quote has been restored", variant: "success" }); loadQuotes(); }).catch(() => toast({ title: "Undo expired", description: "The undo window has closed", variant: "destructive" })); } } : undefined,
      });
      loadQuotes();
      setSelectedIds(ids => ids.filter(id => id !== qid));
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to delete quote", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const r = await bulkDeleteWithSummary(selectedIds, (id) => `/api/admin/quotes/${id}`);
      if (r.deleted > 0) {
        const label = `${r.deleted} quote${r.deleted === 1 ? "" : "s"} deleted`;
        toast({
          title: "Quotes deleted", description: label, variant: "success",
          duration: r.undos.length > 0 ? 30_000 : undefined,
          action: r.undos.length > 0 ? {
            label: "Undo",
            onClick: async () => {
              const result = await bulkUndoAll(r.undos);
              if (result.restored === result.total) {
                toast({ title: "Restored", description: `Restored ${result.restored} quote${result.restored === 1 ? "" : "s"}.`, variant: "success" });
              } else if (result.restored > 0) {
                toast({ title: "Partially restored", description: `Restored ${result.restored}/${result.total}. ${result.failed} could not be restored (expired).`, type: "warning" });
              } else {
                toast({ title: "Undo expired", description: "The undo window has closed", variant: "destructive" });
              }
              if (result.restored > 0) loadQuotes();
            },
          } : undefined,
        });
      }
      if (r.blocked > 0) toast({ title: "Error", description: r.messages[0] || `${r.blocked} could not be deleted (linked records).`, variant: "destructive" });
      loadQuotes();
      if (r.blocked === 0) setSelectedIds([]);
    } catch {
      toast({ title: "Error", description: "Failed to delete quotes", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const columns: Column<Quote>[] = [
    {
      key: 'quoteNumber',
      label: 'Quote',
      sortable: true,
      render: (quote) => (
        <Link href={`/admin/quotes/${quote.id || quote.quoteId}`} className="text-[var(--primary)] font-medium hover:underline">
          {quote.quoteNumber || "Draft"}
        </Link>
      ),
    },
    {
      key: 'clientName',
      label: 'Client',
      sortable: true,
      render: (quote) => quote.clientId ? (
        <Link href={`/admin/clients/${quote.clientId}`} className="text-[var(--primary)] hover:underline">{quote.clientName || '-'}</Link>
      ) : (
        <span className="text-[var(--foreground)]">{quote.clientName || '-'}</span>
      ),
    },
    {
      key: 'siteName',
      label: 'Site',
      sortable: true,
      render: (quote) => <span className="text-[var(--muted-foreground)]">{quote.siteName || '-'}</span>,
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      className: 'text-right',
      headerClassName: 'text-right',
      render: (quote) => (
        <span className="font-semibold text-[var(--foreground)]">
          {'\u00A3'}{(quote.total || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (quote) => getStatusBadge(quote.status),
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      sortable: true,
      render: (quote) => (
        <span className="text-[var(--muted-foreground)]">
          {formatRelativeTime(quote.updatedAt || quote.acceptedAt || quote.lastSentAt)}
        </span>
      ),
    },
  ];

  const actions: Action<Quote>[] = [
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
    <AppShell role="admin" title="Quotes" subtitle="Manage and track all your quotes">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search quotes..."
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
          <Link href="/admin/quotes/new">
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              New Quote
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

        {/* Quotes Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeletonInline columns={6} rows={5} />
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  No quotes yet
                </h3>
                <p className="text-[var(--muted-foreground)] mb-4">
                  Create your first quote to get started
                </p>
                <Link href="/admin/quotes/new">
                  <Button variant="gradient">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Quote
                  </Button>
                </Link>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  No quotes match your filters
                </h3>
                <p className="text-[var(--muted-foreground)] mb-4">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredItems}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                actions={actions}
                getRowId={(row) => row.id || row.quoteId}
                onRowClick={(row) => router.push(`/admin/quotes/${row.id || row.quoteId}`)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.length} quote${selectedIds.length === 1 ? '' : 's'}?`}
        description="Quotes will be removed from view. You can undo this action for a short time."
        confirmLabel="Delete"
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        busy={bulkDeleting}
      />
    </AppShell>
  );
}
