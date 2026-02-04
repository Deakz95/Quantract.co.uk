'use client';

import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/Input";
import { DialogContent } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, ArrowLeft, Settings, X } from "lucide-react";
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    unit: 'each',
    defaultCost: '',
    reorderLevel: '',
    category: 'materials',
  });
  const [saving, setSaving] = useState(false);

  const fetchItems = () => {
    fetch('/api/admin/materials/stock-items')
      .then(r => r.json())
      .then(j => {
        setItems(j.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: '', sku: '', unit: 'each', defaultCost: '', reorderLevel: '', category: 'materials' });
    setShowAddModal(true);
  };

  const openEditModal = (item: StockItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku || '',
      unit: item.unit,
      defaultCost: item.defaultCost ? (item.defaultCost / 100).toString() : '',
      reorderLevel: item.reorderLevel?.toString() || '',
      category: item.category || 'materials',
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: formData.name,
        sku: formData.sku || undefined,
        unit: formData.unit,
        defaultCost: formData.defaultCost ? Math.round(parseFloat(formData.defaultCost) * 100) : undefined,
        reorderLevel: formData.reorderLevel ? parseInt(formData.reorderLevel) : undefined,
        category: formData.category,
      };

      const res = await fetch('/api/admin/materials/stock-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem ? { ...body, id: editingItem.id } : body),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchItems();
      } else {
        alert('Failed to save stock item');
      }
    } catch (err) {
      alert('Error saving stock item');
    } finally {
      setSaving(false);
    }
  };

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

          <Button size="sm" onClick={openAddModal}>
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
              <EmptyState
                icon={Settings}
                title="No stock items found"
                description="Get started by adding your first stock item."
                primaryAction={{ label: "Add your first item", onClick: openAddModal }}
              />
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
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(item)}>Edit</Button>
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

      {/* Add/Edit Stock Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-fade-in">
            <DialogContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-[var(--foreground)]">
                    {editingItem ? 'Edit Stock Item' : 'Add Stock Item'}
                  </div>
                  <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {editingItem ? 'Update the item details below.' : 'Add a new item to your inventory.'}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. 2.5mm Twin & Earth Cable"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">SKU</label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="e.g. CAB-TE-25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Unit *</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm"
                      required
                    >
                      <option value="each">Each</option>
                      <option value="metre">Metre</option>
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                      <option value="roll">Roll</option>
                      <option value="kg">Kilogram</option>
                      <option value="litre">Litre</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Default Cost (£)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.defaultCost}
                      onChange={(e) => setFormData({ ...formData, defaultCost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Reorder Level</label>
                    <Input
                      type="number"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm"
                  >
                    <option value="materials">Materials</option>
                    <option value="tools">Tools</option>
                    <option value="consumables">Consumables</option>
                    <option value="equipment">Equipment</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </div>
        </div>
      )}
    </AppShell>
  );
}
