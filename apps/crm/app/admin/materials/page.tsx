'use client';

import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Settings } from "lucide-react";
import Link from "next/link";

type StockItem = {
  id: string;
  name: string;
  sku?: string;
  unit: string;
  defaultCost?: number;
  reorderLevel?: number;
  category?: string;
  isActive: boolean;
};

export default function MaterialsPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'tools' | 'materials'>('all');

  useEffect(() => {
    fetch('/api/admin/materials/stock-items')
      .then(r => r.json())
      .then(j => {
        setItems(j.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const tools = items.filter(i => i.name.toLowerCase().includes('tool') || i.name.toLowerCase().includes('drill') || i.name.toLowerCase().includes('saw'));
  const materials = items.filter(i => !tools.includes(i));

  const displayItems = filter === 'tools' ? tools : filter === 'materials' ? materials : items;

  return (
    <AppShell role="admin" title="Stock Management" subtitle="Manage tools and materials inventory">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Stock Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setFilter('all')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)]">Total Items</div>
                  <div className="text-3xl font-bold text-[var(--foreground)] mt-1">{items.length}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setFilter('tools')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)]">Tools</div>
                  <div className="text-3xl font-bold text-[var(--foreground)] mt-1">{tools.length}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setFilter('materials')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)]">Materials</div>
                  <div className="text-3xl font-bold text-[var(--foreground)] mt-1">{materials.length}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-[var(--border)]">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === 'all'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            All Items ({items.length})
          </button>
          <button
            onClick={() => setFilter('tools')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === 'tools'
                ? 'border-[var(--warning)] text-[var(--warning)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Tools ({tools.length})
          </button>
          <button
            onClick={() => setFilter('materials')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === 'materials'
                ? 'border-[var(--success)] text-[var(--success)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Materials ({materials.length})
          </button>
        </div>

        {/* Stock Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">Loading stock items...</div>
            ) : displayItems.length === 0 ? (
              <div className="empty-state">
                <Settings className="empty-state-icon" />
                <div className="empty-state-title">No stock items found</div>
                <p className="empty-state-description">Get started by adding your first stock item.</p>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Item
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">SKU</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Unit</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Cost</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Reorder Level</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Status</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                          index % 2 === 0 ? 'bg-[var(--card)]' : 'bg-[var(--muted)]/50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-[var(--foreground)]">{item.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-[var(--muted-foreground)]">{item.sku || '—'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary" className="text-xs">{item.unit}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm text-[var(--foreground)]">
                            {item.defaultCost ? `£${(item.defaultCost / 100).toFixed(2)}` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm text-[var(--muted-foreground)]">{item.reorderLevel || '—'}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={item.isActive ? "default" : "secondary"}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </td>
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
