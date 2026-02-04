"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import { RefreshCcw, AlertTriangle, Truck, Plus } from "lucide-react";

type Asset = {
  id: string;
  type: string;
  name: string;
  identifier: string | null;
  status: string;
  createdAt: string;
};

const TYPE_TABS = [
  { key: "", label: "All" },
  { key: "van", label: "Vans" },
  { key: "ladder", label: "Ladders" },
  { key: "scaffold", label: "Scaffolds" },
] as const;

function getTypeLabel(type: string): string {
  switch (type) {
    case "van": return "Van";
    case "ladder": return "Ladder";
    case "scaffold": return "Scaffold";
    default: return type;
  }
}

export default function AdminAssetsPage() {
  const loadedRef = useRef(false);

  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Create form state
  const [newType, setNewType] = useState<string>("van");
  const [newName, setNewName] = useState("");
  const [newIdentifier, setNewIdentifier] = useState("");

  const load = useCallback(async (type?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const qs = type ? `?type=${type}` : "";
      const data = await apiRequest<{ ok: boolean; data?: Asset[] }>(
        `/api/admin/assets${qs}`,
        { cache: "no-store" },
      );
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to load assets");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) loadedRef.current = true;
    load(typeFilter);
  }, [load, typeFilter]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await apiRequest("/api/admin/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          name: newName.trim(),
          identifier: newIdentifier.trim() || undefined,
        }),
      });
      setShowCreate(false);
      setNewName("");
      setNewIdentifier("");
      load(typeFilter);
    } catch (error) {
      setCreateError(getApiErrorMessage(error, "Failed to create asset"));
    } finally {
      setCreating(false);
    }
  };

  const handleRetire = async (id: string) => {
    try {
      await apiRequest(`/api/admin/assets/${id}`, { method: "DELETE" });
      load(typeFilter);
    } catch (error) {
      alert(getApiErrorMessage(error, "Failed to retire asset"));
    }
  };

  return (
    <AppShell role="admin" title="Assets" subtitle="Manage vans, ladders, and scaffolds">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTypeFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  typeFilter === tab.key
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => load(typeFilter)} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* Create Form */}
        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Asset</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  >
                    <option value="van">Van</option>
                    <option value="ladder">Ladder</option>
                    <option value="scaffold">Scaffold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ford Transit #1"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Identifier</label>
                  <input
                    type="text"
                    value={newIdentifier}
                    onChange={(e) => setNewIdentifier(e.target.value)}
                    placeholder="e.g. Reg plate, serial no."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {createError && (
                <p className="text-sm text-red-600 mt-2">{createError}</p>
              )}
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
                  {creating ? "Creating…" : "Create"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {typeFilter ? `${getTypeLabel(typeFilter)}s` : "All Assets"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <LoadingSkeleton className="h-4 w-40" />
                    <LoadingSkeleton className="mt-2 h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="error-state">
                <AlertTriangle className="error-state-icon" />
                <div className="error-state-title">Unable to load assets</div>
                <p className="error-state-description">{loadError}</p>
                <Button variant="secondary" onClick={() => load(typeFilter)} className="mt-4">
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No assets"
                description={typeFilter ? `No ${getTypeLabel(typeFilter).toLowerCase()}s found.` : "Add vans, ladders, and scaffolds to track inspections."}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Name</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Type</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Identifier</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-[var(--foreground)]">Status</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((asset, index) => (
                      <tr
                        key={asset.id}
                        className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                          index % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]/50"
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-[var(--foreground)]">{asset.name}</td>
                        <td className="py-3 px-4 text-[var(--foreground)]">{getTypeLabel(asset.type)}</td>
                        <td className="py-3 px-4 text-[var(--muted-foreground)]">{asset.identifier || "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={asset.status === "active" ? "success" : "secondary"}>
                            {asset.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {asset.status === "active" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Retire "${asset.name}"? This cannot be undone.`)) {
                                  handleRetire(asset.id);
                                }
                              }}
                            >
                              Retire
                            </Button>
                          )}
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
