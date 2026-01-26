"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Receipt, Check, X, Sparkles, Briefcase } from "lucide-react";
import { cn } from "@/lib/cn";

interface LegalEntity {
  id: string;
  displayName: string;
}

interface ServiceLine {
  id: string;
  name: string;
  slug: string;
  description?: string;
  defaultLegalEntityId?: string;
  DefaultLegalEntity?: LegalEntity | null;
  isDefault: boolean;
  status: "active" | "inactive";
}

export function ServiceLinesSettings() {
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [slRes, leRes] = await Promise.all([
        fetch("/api/admin/service-lines"),
        fetch("/api/admin/legal-entities"),
      ]);
      const slData = await slRes.json();
      const leData = await leRes.json();

      if (slData.ok) {
        setServiceLines(slData.serviceLines);
      } else {
        setError(slData.error || "Failed to load service lines");
      }

      if (leData.ok) {
        setLegalEntities(leData.entities);
      }
    } catch {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (serviceLine: Partial<ServiceLine>) => {
    try {
      const res = await fetch("/api/admin/service-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceLine),
      });
      const data = await res.json();
      if (data.ok) {
        setShowNew(false);
        fetchData();
      } else {
        setError(data.error || "Failed to create");
      }
    } catch {
      setError("Failed to create service line");
    }
  };

  const handleUpdate = async (id: string, serviceLine: Partial<ServiceLine>) => {
    try {
      const res = await fetch(`/api/admin/service-lines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceLine),
      });
      const data = await res.json();
      if (data.ok) {
        setEditingId(null);
        fetchData();
      } else {
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Failed to update service line");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service line?")) return;
    try {
      const res = await fetch(`/api/admin/service-lines/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        fetchData();
      } else {
        setError(data.message || data.error || "Failed to delete");
      }
    } catch {
      setError("Failed to delete service line");
    }
  };

  const handleSetDefault = async (id: string) => {
    await handleUpdate(id, { isDefault: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Service Lines</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Define service categories and link them to legal entities for automatic billing.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} disabled={showNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Service Line
        </Button>
      </div>

      {showNew && (
        <ServiceLineForm
          legalEntities={legalEntities}
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
        />
      )}

      <div className="space-y-4">
        {serviceLines.map((serviceLine) => (
          <div key={serviceLine.id}>
            {editingId === serviceLine.id ? (
              <ServiceLineForm
                serviceLine={serviceLine}
                legalEntities={legalEntities}
                onSave={(data) => handleUpdate(serviceLine.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ServiceLineCard
                serviceLine={serviceLine}
                onEdit={() => setEditingId(serviceLine.id)}
                onDelete={() => handleDelete(serviceLine.id)}
                onSetDefault={() => handleSetDefault(serviceLine.id)}
              />
            )}
          </div>
        ))}
      </div>

      {serviceLines.length === 0 && !showNew && (
        <div className="text-center py-12 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <Receipt className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <h4 className="text-lg font-medium text-[var(--foreground)] mb-2">No service lines</h4>
          <p className="text-[var(--muted-foreground)] mb-4">
            Create service lines to categorize your work and link to billing entities.
          </p>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Service Line
          </Button>
        </div>
      )}
    </div>
  );
}

function ServiceLineCard({
  serviceLine,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  serviceLine: ServiceLine;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div className={cn(
      "bg-[var(--card)] border rounded-xl p-6 transition-all",
      serviceLine.isDefault ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20" : "border-[var(--border)]"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            serviceLine.isDefault ? "bg-[var(--primary)]/10" : "bg-[var(--muted)]"
          )}>
            <Receipt className={cn(
              "w-6 h-6",
              serviceLine.isDefault ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-[var(--foreground)]">{serviceLine.name}</h4>
              {serviceLine.isDefault && (
                <Badge variant="gradient" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Default
                </Badge>
              )}
              <Badge variant={serviceLine.status === "active" ? "success" : "secondary"} className="text-xs">
                {serviceLine.status}
              </Badge>
            </div>
            {serviceLine.description && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{serviceLine.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-[var(--muted-foreground)]">
              <code className="bg-[var(--muted)] px-2 py-0.5 rounded">{serviceLine.slug}</code>
              {serviceLine.DefaultLegalEntity && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {serviceLine.DefaultLegalEntity.displayName}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!serviceLine.isDefault && (
            <Button variant="ghost" size="sm" onClick={onSetDefault} title="Set as default">
              <Sparkles className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={serviceLine.isDefault}>
            <X className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ServiceLineForm({
  serviceLine,
  legalEntities,
  onSave,
  onCancel,
}: {
  serviceLine?: ServiceLine;
  legalEntities: LegalEntity[];
  onSave: (data: Partial<ServiceLine>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<ServiceLine>>(
    serviceLine || {
      name: "",
      slug: "",
      description: "",
      defaultLegalEntityId: "",
      isDefault: false,
      status: "active",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      defaultLegalEntityId: form.defaultLegalEntityId || undefined,
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
      <h4 className="text-lg font-semibold text-[var(--foreground)]">
        {serviceLine ? "Edit Service Line" : "New Service Line"}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Name *</label>
          <Input
            value={form.name || ""}
            onChange={(e) => {
              const name = e.target.value;
              setForm({
                ...form,
                name,
                slug: form.slug || generateSlug(name),
              });
            }}
            placeholder="e.g. Electrical Testing"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Slug</label>
          <Input
            value={form.slug || ""}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="e.g. electrical-testing"
          />
          <p className="text-xs text-[var(--muted-foreground)] mt-1">URL-friendly identifier</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Description</label>
        <Input
          value={form.description || ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief description of this service line"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Default Legal Entity</label>
        <select
          value={form.defaultLegalEntityId || ""}
          onChange={(e) => setForm({ ...form, defaultLegalEntityId: e.target.value })}
          className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">-- Use company default --</option>
          {legalEntities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.displayName}
            </option>
          ))}
        </select>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          Invoices and certificates for this service line will use this entity by default
        </p>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isDefault || false}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            className="w-4 h-4 rounded border-[var(--border)]"
          />
          <span className="text-sm text-[var(--foreground)]">Set as default service line</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.status === "active"}
            onChange={(e) => setForm({ ...form, status: e.target.checked ? "active" : "inactive" })}
            className="w-4 h-4 rounded border-[var(--border)]"
          />
          <span className="text-sm text-[var(--foreground)]">Active</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
        <Button type="button" variant="secondary" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit">
          <Check className="w-4 h-4 mr-2" />
          {serviceLine ? "Save Changes" : "Create Service Line"}
        </Button>
      </div>
    </form>
  );
}
