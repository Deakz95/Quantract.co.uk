'use client';

import { useEffect, useState, useMemo } from 'react';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterDropdown, type Filters, type FilterConfig } from "@/components/ui/FilterDropdown";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";

type Quote = {
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  siteName?: string;
  total: number;
  status: string;
  lastSentAt?: string;
  acceptedAt?: string;
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
  const [items, setItems] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({});

  useEffect(() => {
    fetch('/api/admin/quotes/summary')
      .then(r => r.json())
      .then(j => { setItems(j.data || []); setLoading(false); });
  }, []);

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
    return items.filter(quote => {
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
  }, [items, searchTerm, filters]);

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

        {/* Quotes Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-[var(--muted-foreground)]">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                Loading quotes...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  {items.length === 0 ? 'No quotes yet' : 'No quotes match your filters'}
                </h3>
                <p className="text-[var(--muted-foreground)] mb-4">
                  {items.length === 0
                    ? 'Create your first quote to get started'
                    : 'Try adjusting your search or filter criteria'}
                </p>
                {items.length === 0 && (
                  <Link href="/admin/quotes/new">
                    <Button variant="gradient">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Quote
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Quote</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Client</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Site</th>
                      <th className="text-right p-4 text-sm font-semibold text-[var(--foreground)]">Total</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((q, index) => (
                      <tr key={q.quoteId} className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors cursor-pointer ${
                        index % 2 === 0 ? 'bg-[var(--card)]' : 'bg-[var(--muted)]/50'
                      }`}>
                        <td className="p-4">
                          <Link href={`/admin/quotes/${q.quoteId}`} className="text-[var(--primary)] font-medium hover:underline">
                            {q.quoteNumber || `Q-${q.quoteId?.slice(0, 8)}`}
                          </Link>
                        </td>
                        <td className="p-4 text-[var(--foreground)]">{q.clientName || '—'}</td>
                        <td className="p-4 text-[var(--muted-foreground)]">{q.siteName || '—'}</td>
                        <td className="p-4 text-right font-semibold text-[var(--foreground)]">£{((q.total || 0) / 100).toFixed(2)}</td>
                        <td className="p-4">{getStatusBadge(q.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
