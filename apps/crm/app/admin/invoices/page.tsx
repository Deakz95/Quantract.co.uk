'use client';

import { useEffect, useState, useMemo } from 'react';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterDropdown, type Filters, type FilterConfig } from "@/components/ui/FilterDropdown";
import { Receipt, Plus } from "lucide-react";
import Link from "next/link";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  dueDate?: string;
  createdAt?: string;
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
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({});

  useEffect(() => {
    fetch('/api/admin/invoices')
      .then(r => r.json())
      .then(j => { setItems(j.data || j.items || j.invoices || []); setLoading(false); });
  }, []);

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
    return items.filter(invoice => {
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
        if (invoice.dueDate) {
          const date = new Date(invoice.dueDate);
          if (dateRange.from && date < new Date(dateRange.from)) return false;
          if (dateRange.to && date > new Date(dateRange.to + 'T23:59:59')) return false;
        } else if (dateRange.from || dateRange.to) {
          return false;
        }
      }

      return true;
    });
  }, [items, searchTerm, filters]);

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

        {/* Invoices Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-[var(--muted-foreground)]">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                Loading invoices...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  {items.length === 0 ? 'No invoices yet' : 'No invoices match your filters'}
                </h3>
                <p className="text-[var(--muted-foreground)] mb-4">
                  {items.length === 0
                    ? 'Create your first invoice to get started'
                    : 'Try adjusting your search or filter criteria'}
                </p>
                {items.length === 0 && (
                  <Link href="/admin/invoices/new">
                    <Button variant="gradient">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invoice
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Invoice</th>
                        <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Client</th>
                        <th className="text-right p-4 text-sm font-semibold text-[var(--foreground)]">Total</th>
                        <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Status</th>
                        <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map(i => (
                        <tr key={i.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors cursor-pointer">
                          <td className="p-4">
                            <Link href={`/admin/invoices/${i.id}`} className="text-[var(--primary)] font-medium hover:underline">
                              {i.invoiceNumber || `INV-${i.id?.slice(0, 8)}`}
                            </Link>
                          </td>
                          <td className="p-4 text-[var(--foreground)]">{i.client?.name || '-'}</td>
                          <td className="p-4 text-right font-semibold text-[var(--foreground)]">£{((i.total || 0) / 100).toFixed(2)}</td>
                          <td className="p-4">{getStatusBadge(i.status)}</td>
                          <td className="p-4 text-[var(--muted-foreground)]">{formatDate(i.dueDate || '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                          <span className="font-semibold text-[var(--foreground)]">£{((i.total || 0) / 100).toFixed(2)}</span>
                          <span className="text-[var(--muted-foreground)]">Due: {formatDate(i.dueDate || '')}</span>
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
    </AppShell>
  );
}
