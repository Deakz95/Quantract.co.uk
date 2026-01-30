'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterDropdown, type Filters, type FilterConfig } from "@/components/ui/FilterDropdown";
import { DataTable, BulkActionBar, formatRelativeTime, type Column, type Action, type SortDirection } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { Receipt, Plus, SquarePen, Copy, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  dueDate?: string;
  dueAt?: string;
  dueAtISO?: string;
  createdAt?: string;
  updatedAt?: string;
  client?: {
    id: string;
    name: string;
    email: string;
  };
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

export default function InvoicesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/invoices');
      const json = await response.json();

      // Handle API errors
      if (!response.ok || json.error) {
        toast({ title: "Error", description: json.error || "Failed to load invoices", variant: "destructive" });
        setItems([]);
        return;
      }

      // Ensure we always have an array (defensive coding)
      const raw = Array.isArray(json.data) ? json.data
        : Array.isArray(json.items) ? json.items
        : Array.isArray(json.invoices) ? json.invoices
        : Array.isArray(json) ? json
        : [];
      // Normalize: API returns dueAt, frontend expects dueDate
      const data = raw.map((inv: any) => ({
        ...inv,
        dueDate: inv.dueDate || inv.dueAt || inv.dueAtISO || undefined,
      }));
      setItems(data);
    } catch {
      toast({ title: "Error", description: "Failed to load invoices", variant: "destructive" });
      setItems([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // toast is intentionally excluded - it's a side-effect function that shouldn't trigger re-fetching

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Extract unique clients for filter options
  const clientOptions = useMemo(() => {
    const uniqueClients = new Map<string, string>();
    items.forEach(inv => {
      if (inv.client?.name) {
        uniqueClients.set(inv.client.name, inv.client.name);
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
      key: "dueDate",
      label: "Due Date",
      type: "daterange",
    },
  ];

  // Apply filters and search
  const filteredItems = useMemo(() => {
    let result = items.filter(invoice => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          (invoice.invoiceNumber?.toLowerCase().includes(search)) ||
          (invoice.client?.name?.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }

      // Status filter (multiselect)
      const statusFilter = filters.status as string[] | undefined;
      if (statusFilter && statusFilter.length > 0) {
        if (!statusFilter.includes(invoice.status?.toLowerCase())) {
          return false;
        }
      }

      // Client filter
      const clientFilter = filters.client as string | undefined;
      if (clientFilter && invoice.client?.name !== clientFilter) {
        return false;
      }

      // Due date range filter
      const dateRange = filters.dueDate as { from?: string; to?: string } | undefined;
      if (dateRange) {
        const dueDateVal = invoice.dueDate || invoice.dueAt || invoice.dueAtISO;
        if (dueDateVal) {
          const date = new Date(dueDateVal);
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

        // Handle nested client property
        if (sortKey === 'clientName') {
          aVal = a.client?.name;
          bVal = b.client?.name;
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
  }, [items, searchTerm, filters, sortKey, sortDirection]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      paid: "success",
      sent: "warning",
      pending: "warning",
      draft: "secondary",
      overdue: "destructive",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status?.toLowerCase()] || "secondary"}>{status || 'Draft'}</Badge>;
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleSort = (key: string, direction: SortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleEdit = (invoice: Invoice) => {
    router.push(`/admin/invoices/${invoice.id}`);
  };

  const handleDuplicate = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/duplicate`, {
        method: 'POST',
      });
      if (response.ok) {
        toast({ title: "Success", description: "Invoice duplicated", variant: "success" });
        loadInvoices();
      } else {
        throw new Error('Failed to duplicate');
      }
    } catch {
      toast({ title: "Error", description: "Failed to duplicate invoice", variant: "destructive" });
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast({ title: "Deleted", description: "Invoice deleted", variant: "success" });
        loadInvoices();
        setSelectedIds(ids => ids.filter(id => id !== invoice.id));
      } else {
        throw new Error('Failed to delete');
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all(
        selectedIds.map(id =>
          fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' })
        )
      );
      toast({ title: "Deleted", description: `${selectedIds.length} invoices deleted`, variant: "success" });
      loadInvoices();
      setSelectedIds([]);
    } catch {
      toast({ title: "Error", description: "Failed to delete some invoices", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      label: 'Invoice',
      sortable: true,
      render: (invoice) => (
        <Link href={`/admin/invoices/${invoice.id}`} className="text-[var(--primary)] font-medium hover:underline">
          {invoice.invoiceNumber || `INV-${invoice.id?.slice(0, 8)}`}
        </Link>
      ),
    },
    {
      key: 'clientName',
      label: 'Client',
      sortable: true,
      render: (invoice) => <span className="text-[var(--foreground)]">{invoice.client?.name || '-'}</span>,
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      className: 'text-right',
      headerClassName: 'text-right',
      render: (invoice) => (
        <span className="font-semibold text-[var(--foreground)]">
          {'\u00A3'}{(invoice.total || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (invoice) => getStatusBadge(invoice.status),
    },
    {
      key: 'dueDate',
      label: 'Due',
      sortable: true,
      render: (invoice) => {
        const due = invoice.dueDate || invoice.dueAt || invoice.dueAtISO || '';
        return <span className="text-[var(--muted-foreground)]">{formatDate(due)}</span>;
      },
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      sortable: true,
      render: (invoice) => (
        <span className="text-[var(--muted-foreground)]">
          {formatRelativeTime(invoice.updatedAt || invoice.createdAt)}
        </span>
      ),
    },
  ];

  const actions: Action<Invoice>[] = [
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
    <AppShell role="admin" title="Invoices" subtitle="Manage and track all your invoices">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search invoices..."
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
          <Link href="/admin/invoices/new">
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
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

        {/* Invoices Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-[var(--muted-foreground)]">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                Loading invoices...
              </div>
            ) : items.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Receipt}
                  title="No invoices yet"
                  description="Invoices are how you get paid. Create professional invoices from quotes or from scratch, and track payment status."
                  features={[
                    "Generate invoices from accepted quotes automatically",
                    "Track payment status with due date reminders",
                    "Send invoices via email with online payment options"
                  ]}
                  primaryAction={{ label: "Create your first invoice", href: "/admin/invoices/new" }}
                  secondaryAction={{ label: "Learn more", href: "/admin/help/invoicing" }}
                />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  No invoices match your filters
                </h3>
                <p className="text-[var(--muted-foreground)] mb-4">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table using DataTable */}
                <div className="hidden md:block">
                  <DataTable
                    columns={columns}
                    data={filteredItems}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    actions={actions}
                    getRowId={(row) => row.id}
                    onRowClick={(row) => router.push(`/admin/invoices/${row.id}`)}
                  />
                </div>

                {/* Mobile cards */}
                <div className="md:hidden p-4 space-y-3">
                  {filteredItems.map(i => (
                    <Link key={i.id} href={`/admin/invoices/${i.id}`}>
                      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)] transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-[var(--primary)]">{i.invoiceNumber}</span>
                          {getStatusBadge(i.status)}
                        </div>
                        <div className="text-sm text-[var(--muted-foreground)]">{i.client?.name}</div>
                        <div className="flex justify-between mt-3 text-sm">
                          <span className="font-semibold text-[var(--foreground)]">{'\u00A3'}{(i.total || 0).toFixed(2)}</span>
                          <span className="text-[var(--muted-foreground)]">Due: {formatDate(i.dueDate || i.dueAt || i.dueAtISO || '')}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.length} invoice${selectedIds.length === 1 ? '' : 's'}?`}
        description="This action cannot be undone. All selected invoices will be permanently deleted."
        confirmLabel="Delete"
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        busy={bulkDeleting}
      />
    </AppShell>
  );
}
