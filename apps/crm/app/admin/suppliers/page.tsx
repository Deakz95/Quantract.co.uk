'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column, type SortDirection } from "@/components/ui/DataTable";
import { TableSkeletonInline } from "@/components/ui/TableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/useToast";
import { Briefcase } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  email: string;
  expenseCount: number;
};

export default function SuppliersPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/suppliers');
      const json = await res.json();
      if (!res.ok || json.error) {
        toast({ title: "Error", description: json.error || "Failed to load suppliers", variant: "destructive" });
        setItems([]);
        return;
      }
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch {
      toast({ title: "Error", description: "Failed to load suppliers", variant: "destructive" });
      setItems([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(search) ||
        s.email?.toLowerCase().includes(search)
      );
    }

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
  }, [items, searchTerm, sortKey, sortDirection]);

  const handleSort = (key: string, direction: SortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (s) => <span className="font-medium text-[var(--foreground)]">{s.name}</span>,
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (s) => <span className="text-[var(--muted-foreground)]">{s.email || '-'}</span>,
    },
    {
      key: 'expenseCount',
      label: 'Expenses',
      sortable: true,
      className: 'text-right',
      headerClassName: 'text-right',
      render: (s) => (
        <Badge variant={s.expenseCount > 0 ? "secondary" : "outline"}>
          {s.expenseCount}
        </Badge>
      ),
    },
  ];

  return (
    <AppShell role="admin" title="Suppliers" subtitle="Manage supplier records">
      <div className="space-y-6">
        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] w-64"
          />
        </div>

        {/* Suppliers Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeletonInline columns={3} rows={6} />
            ) : items.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Briefcase}
                  title="No suppliers yet"
                  description="Suppliers are created automatically when expenses are confirmed with a supplier name."
                  features={[
                    "Track supplier contacts and spending history",
                    "Auto-created from expense receipts",
                    "View linked expenses per supplier"
                  ]}
                />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  No suppliers match your search
                </h3>
                <p className="text-[var(--muted-foreground)] mb-4">
                  Try adjusting your search term
                </p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredItems}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                getRowId={(row) => row.id}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
