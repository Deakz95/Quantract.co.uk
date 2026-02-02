"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronUp, Briefcase, Trash2, X } from "lucide-react";

interface StockItemOption {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
}

/** A TruckStock record = qty of a StockItem assigned to an engineer */
interface TruckStockRecord {
  id: string;
  qty: number;
  minQty: number;
  stockItem: StockItemOption;
  user: { id: string; name: string | null; email: string };
}

interface Engineer {
  id: string;
  name: string | null;
  email: string;
}

export default function TruckStockPage() {
  const [records, setRecords] = useState<TruckStockRecord[]>([]);
  const [stockItems, setStockItems] = useState<StockItemOption[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowOnly, setLowOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [filterEngineer, setFilterEngineer] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Add record form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("pcs");
  const [newSku, setNewSku] = useState("");
  const [selectedStockItemId, setSelectedStockItemId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newMinQty, setNewMinQty] = useState(0);
  const [saving, setSaving] = useState(false);

  /** Load TruckStock records (the primary data — not StockItem definitions) */
  function loadRecords() {
    const params = lowOnly ? "?lowStock=true" : "";
    fetch(`/api/admin/truck-stock${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setRecords(d.data);
          setError(null);
          setFeatureDisabled(false);
        } else if (d.error === "feature_not_available") {
          setFeatureDisabled(true);
          setError("Truck inventory feature is not enabled on your plan.");
        }
      })
      .catch(() => setError("Failed to load stock records."))
      .finally(() => setLoading(false));
  }

  /** Load StockItem catalogue (for the "add" dropdown) */
  function loadStockItems() {
    fetch("/api/admin/truck-stock/stock-items")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setStockItems(d.data); })
      .catch(() => {});
  }

  /** Load engineers (for the "assign to" dropdown) */
  function loadEngineers() {
    fetch("/api/admin/engineers")
      .then((r) => r.json())
      .then((d) => setEngineers(d.engineers || d.data || []))
      .catch(() => {});
  }

  useEffect(() => { loadRecords(); }, [lowOnly]);
  useEffect(() => { loadStockItems(); loadEngineers(); }, []);

  /** Adjust qty on an existing record by ±delta using POST /truck-stock (existing upsert endpoint) */
  async function adjustByDelta(rec: TruckStockRecord, delta: number) {
    // Optimistic update
    setRecords((prev) =>
      prev.map((r) =>
        r.id === rec.id ? { ...r, qty: Math.max(0, r.qty + delta) } : r
      )
    );

    const res = await fetch("/api/admin/truck-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockItemId: rec.stockItem.id,
        userId: rec.user.id,
        qtyDelta: delta,
      }),
    });

    if (!res.ok) {
      // Revert on failure
      loadRecords();
    }
  }

  /** Delete a record */
  async function deleteRecord(recordId: string) {
    if (!confirm("Remove this stock record?")) return;
    const res = await fetch(`/api/admin/truck-stock/${recordId}`, { method: "DELETE" });
    if (res.ok) {
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
    } else {
      loadRecords();
    }
  }

  /** Create a new TruckStock record (optionally creating a StockItem first) */
  async function handleAdd() {
    setSaving(true);
    try {
      let stockItemId = selectedStockItemId;

      // If "new" selected or no stock items exist, create a StockItem first
      if (!stockItemId || stockItemId === "__new__") {
        if (!newName.trim()) { setSaving(false); return; }
        const res = await fetch("/api/admin/truck-stock/stock-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim(), unit: newUnit, sku: newSku.trim() || undefined }),
        });
        const d = await res.json();
        if (!d.ok) { setSaving(false); return; }
        stockItemId = d.data.id;
        loadStockItems();
      }

      if (!selectedUserId) { setSaving(false); return; }

      // Create the TruckStock record via POST (upserts by companyId+userId+stockItemId)
      const res = await fetch("/api/admin/truck-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockItemId,
          userId: selectedUserId,
          qty: newQty,
          minQty: newMinQty,
        }),
      });

      const d = await res.json();
      if (!d.ok) { setSaving(false); return; }

      setShowAdd(false);
      setNewName("");
      setNewSku("");
      setNewUnit("pcs");
      setSelectedStockItemId("");
      setSelectedUserId("");
      setNewQty(1);
      setNewMinQty(0);
      loadRecords();
    } finally {
      setSaving(false);
    }
  }

  const filtered = records.filter((r) => {
    if (filterEngineer && r.user.id !== filterEngineer) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (
        !r.stockItem.name.toLowerCase().includes(q) &&
        !(r.stockItem.sku || "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  return (
    <AppShell role="admin" title="Truck / Van Stock" subtitle="Track materials and parts on engineer vehicles">
      <div className="space-y-4">
        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Toolbar — hidden when feature is disabled */}
        {!featureDisabled && <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <select
              value={filterEngineer}
              onChange={(e) => setFilterEngineer(e.target.value)}
              className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--background)] text-[var(--foreground)] min-w-[140px]"
            >
              <option value="">All engineers</option>
              {engineers.map((eng) => (
                <option key={eng.id} value={eng.id}>{eng.name || eng.email}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search items..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] w-44"
            />
            <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
                className="rounded"
              />
              Low stock only
            </label>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Stock Item
          </Button>
        </div>}

        {/* Add record form */}
        {!featureDisabled && showAdd && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[var(--foreground)]">Assign Stock to Engineer</div>
              <button onClick={() => setShowAdd(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Stock Item</label>
                <select
                  value={selectedStockItemId}
                  onChange={(e) => setSelectedStockItemId(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)]"
                >
                  <option value="">Select existing item...</option>
                  {stockItems.map((si) => (
                    <option key={si.id} value={si.id}>{si.name} ({si.unit})</option>
                  ))}
                  <option value="__new__">+ Create new item</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Engineer</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)]"
                >
                  <option value="">Select engineer...</option>
                  {engineers.map((eng) => (
                    <option key={eng.id} value={eng.id}>{eng.name || eng.email}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* New StockItem fields — shown when creating inline */}
            {(selectedStockItemId === "__new__" || (selectedStockItemId === "" && stockItems.length === 0)) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Item Name</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. 2.5mm Twin & Earth"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Unit</label>
                  <input
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="pcs, m, rolls"
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">SKU (optional)</label>
                  <input
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)]"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Min Qty (reorder)</label>
                <input
                  type="number"
                  min={0}
                  value={newMinQty}
                  onChange={(e) => setNewMinQty(Number(e.target.value))}
                  className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? "Saving..." : "Add Record"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Records table */}
        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading stock records...
          </div>
        ) : featureDisabled ? (
          null
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">
              {lowOnly ? "No low-stock items" : "No stock assigned yet"}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              {lowOnly
                ? "All items are above their minimum quantity."
                : "Assign items to vans or engineers to track inventory. Click \"Add Stock Item\" to get started."}
            </p>
            {!lowOnly && (
              <Button size="sm" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Stock Item
              </Button>
            )}
          </div>
        ) : records.length > 0 && filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              No items match your filters. Try adjusting the engineer or search term.
            </p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)]">Engineer</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)]">Item</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)]">SKU</th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-[var(--muted-foreground)]">Qty</th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-[var(--muted-foreground)]">Min</th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-[var(--muted-foreground)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec) => (
                  <tr
                    key={rec.id}
                    className={`border-b border-[var(--border)] ${rec.qty <= rec.minQty ? "bg-red-50 dark:bg-red-950/20" : ""}`}
                  >
                    <td className="py-2.5 px-4 text-[var(--foreground)]">{rec.user.name || rec.user.email}</td>
                    <td className="py-2.5 px-4 font-medium text-[var(--foreground)]">{rec.stockItem.name}</td>
                    <td className="py-2.5 px-4 text-[var(--muted-foreground)]">{rec.stockItem.sku || "-"}</td>
                    <td className="py-2.5 px-4 text-right text-[var(--foreground)] font-medium">
                      {rec.qty} {rec.stockItem.unit}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[var(--muted-foreground)]">{rec.minQty}</td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => adjustByDelta(rec, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                          title="Decrease by 1"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => adjustByDelta(rec, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                          title="Increase by 1"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteRecord(rec.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-red-50 dark:hover:bg-red-950/20 text-[var(--muted-foreground)] hover:text-red-600 transition-colors ml-1"
                          title="Delete record"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
