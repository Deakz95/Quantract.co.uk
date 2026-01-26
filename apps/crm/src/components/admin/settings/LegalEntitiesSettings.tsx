"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Briefcase, Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface LegalEntity {
  id: string;
  displayName: string;
  legalName: string;
  companyNumber?: string;
  vatNumber?: string;
  registeredAddress1?: string;
  registeredAddress2?: string;
  registeredCity?: string;
  registeredCounty?: string;
  registeredPostcode?: string;
  registeredCountry?: string;
  pdfFooterLine1?: string;
  pdfFooterLine2?: string;
  invoiceNumberPrefix: string;
  certificateNumberPrefix: string;
  isDefault: boolean;
  status: "active" | "inactive";
}

export function LegalEntitiesSettings() {
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/legal-entities");
      const data = await res.json();
      if (data.ok) {
        setEntities(data.entities);
      } else {
        setError(data.error || "Failed to load");
      }
    } catch {
      setError("Failed to fetch legal entities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const handleCreate = async (entity: Partial<LegalEntity>) => {
    try {
      const res = await fetch("/api/admin/legal-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entity),
      });
      const data = await res.json();
      if (data.ok) {
        setShowNew(false);
        fetchEntities();
      } else {
        setError(data.error || "Failed to create");
      }
    } catch {
      setError("Failed to create legal entity");
    }
  };

  const handleUpdate = async (id: string, entity: Partial<LegalEntity>) => {
    try {
      const res = await fetch(`/api/admin/legal-entities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entity),
      });
      const data = await res.json();
      if (data.ok) {
        setEditingId(null);
        fetchEntities();
      } else {
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Failed to update legal entity");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this legal entity?")) return;
    try {
      const res = await fetch(`/api/admin/legal-entities/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        fetchEntities();
      } else {
        setError(data.message || data.error || "Failed to delete");
      }
    } catch {
      setError("Failed to delete legal entity");
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
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Legal Entities</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage your company legal entities for invoicing and certificates.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} disabled={showNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Entity
        </Button>
      </div>

      {showNew && (
        <LegalEntityForm
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
        />
      )}

      <div className="space-y-4">
        {entities.map((entity) => (
          <div key={entity.id}>
            {editingId === entity.id ? (
              <LegalEntityForm
                entity={entity}
                onSave={(data) => handleUpdate(entity.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <LegalEntityCard
                entity={entity}
                onEdit={() => setEditingId(entity.id)}
                onDelete={() => handleDelete(entity.id)}
                onSetDefault={() => handleSetDefault(entity.id)}
              />
            )}
          </div>
        ))}
      </div>

      {entities.length === 0 && !showNew && (
        <div className="text-center py-12 bg-[var(--card)] border border-[var(--border)] rounded-xl">
          <Briefcase className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <h4 className="text-lg font-medium text-[var(--foreground)] mb-2">No legal entities</h4>
          <p className="text-[var(--muted-foreground)] mb-4">
            Create your first legal entity to manage multi-entity invoicing.
          </p>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Entity
          </Button>
        </div>
      )}
    </div>
  );
}

function LegalEntityCard({
  entity,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  entity: LegalEntity;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div className={cn(
      "bg-[var(--card)] border rounded-xl p-6 transition-all",
      entity.isDefault ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20" : "border-[var(--border)]"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            entity.isDefault ? "bg-[var(--primary)]/10" : "bg-[var(--muted)]"
          )}>
            <Briefcase className={cn(
              "w-6 h-6",
              entity.isDefault ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-[var(--foreground)]">{entity.displayName}</h4>
              {entity.isDefault && (
                <Badge variant="gradient" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Default
                </Badge>
              )}
              <Badge variant={entity.status === "active" ? "success" : "secondary"} className="text-xs">
                {entity.status}
              </Badge>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">{entity.legalName}</p>
            {entity.companyNumber && (
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Company No: {entity.companyNumber}
                {entity.vatNumber && ` | VAT: ${entity.vatNumber}`}
              </p>
            )}
            <div className="flex gap-4 mt-2 text-xs text-[var(--muted-foreground)]">
              <span>Invoice prefix: <code className="bg-[var(--muted)] px-1 rounded">{entity.invoiceNumberPrefix}</code></span>
              <span>Certificate prefix: <code className="bg-[var(--muted)] px-1 rounded">{entity.certificateNumberPrefix}</code></span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!entity.isDefault && (
            <Button variant="ghost" size="sm" onClick={onSetDefault} title="Set as default">
              <Sparkles className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={entity.isDefault}>
            <X className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function LegalEntityForm({
  entity,
  onSave,
  onCancel,
}: {
  entity?: LegalEntity;
  onSave: (data: Partial<LegalEntity>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<LegalEntity>>(
    entity || {
      displayName: "",
      legalName: "",
      companyNumber: "",
      vatNumber: "",
      registeredAddress1: "",
      registeredCity: "",
      registeredPostcode: "",
      registeredCountry: "United Kingdom",
      invoiceNumberPrefix: "INV-",
      certificateNumberPrefix: "CERT-",
      pdfFooterLine1: "",
      pdfFooterLine2: "",
      isDefault: false,
      status: "active",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
      <h4 className="text-lg font-semibold text-[var(--foreground)]">
        {entity ? "Edit Legal Entity" : "New Legal Entity"}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Display Name *</label>
          <Input
            value={form.displayName || ""}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="e.g. Quantract Ltd"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Legal Name</label>
          <Input
            value={form.legalName || ""}
            onChange={(e) => setForm({ ...form, legalName: e.target.value })}
            placeholder="e.g. Quantract Limited"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Company Number</label>
          <Input
            value={form.companyNumber || ""}
            onChange={(e) => setForm({ ...form, companyNumber: e.target.value })}
            placeholder="e.g. 12345678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">VAT Number</label>
          <Input
            value={form.vatNumber || ""}
            onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
            placeholder="e.g. GB123456789"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Registered Address</label>
        <Input
          value={form.registeredAddress1 || ""}
          onChange={(e) => setForm({ ...form, registeredAddress1: e.target.value })}
          placeholder="Address line 1"
          className="mb-2"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            value={form.registeredCity || ""}
            onChange={(e) => setForm({ ...form, registeredCity: e.target.value })}
            placeholder="City"
          />
          <Input
            value={form.registeredPostcode || ""}
            onChange={(e) => setForm({ ...form, registeredPostcode: e.target.value })}
            placeholder="Postcode"
          />
          <Input
            value={form.registeredCountry || ""}
            onChange={(e) => setForm({ ...form, registeredCountry: e.target.value })}
            placeholder="Country"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Invoice Number Prefix</label>
          <Input
            value={form.invoiceNumberPrefix || ""}
            onChange={(e) => setForm({ ...form, invoiceNumberPrefix: e.target.value })}
            placeholder="INV-"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Certificate Number Prefix</label>
          <Input
            value={form.certificateNumberPrefix || ""}
            onChange={(e) => setForm({ ...form, certificateNumberPrefix: e.target.value })}
            placeholder="CERT-"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">PDF Footer Lines</label>
        <Input
          value={form.pdfFooterLine1 || ""}
          onChange={(e) => setForm({ ...form, pdfFooterLine1: e.target.value })}
          placeholder="Footer line 1 (e.g. Company registration info)"
          className="mb-2"
        />
        <Input
          value={form.pdfFooterLine2 || ""}
          onChange={(e) => setForm({ ...form, pdfFooterLine2: e.target.value })}
          placeholder="Footer line 2 (e.g. VAT registration info)"
        />
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.isDefault || false}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            className="w-4 h-4 rounded border-[var(--border)]"
          />
          <span className="text-sm text-[var(--foreground)]">Set as default entity</span>
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
          {entity ? "Save Changes" : "Create Entity"}
        </Button>
      </div>
    </form>
  );
}
