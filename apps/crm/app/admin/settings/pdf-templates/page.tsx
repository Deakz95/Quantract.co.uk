"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { hasEntitlement, getUnlockingPlan, getPlanLabel, type Entitlements } from "@/lib/entitlements";
import { FileText, Plus, Star, Trash2, Loader2 } from "lucide-react";

type PdfTemplateVersion = { id: string; version: number; createdAt: string };
type PdfTemplate = {
  id: string;
  companyId: string;
  docType: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  versions: PdfTemplateVersion[];
};

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  quote: "Quote",
  certificate: "Certificate",
  variation: "Variation",
  receipt: "Receipt",
};

const DOC_TYPES = ["invoice", "quote", "certificate", "variation", "receipt"];

export default function PdfTemplatesPage() {
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDocType, setNewDocType] = useState("invoice");
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [templatesRes, entRes] = await Promise.all([
        fetch("/api/admin/pdf-templates"),
        fetch("/api/entitlements/me"),
      ]);
      const templatesData = await templatesRes.json();
      const entData = await entRes.json();
      if (templatesData.ok) setTemplates(templatesData.templates);
      if (entData.entitlements) setEntitlements(entData.entitlements);
    } catch {
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const canUseTemplates = entitlements ? hasEntitlement(entitlements, "feature_pdf_templates") : false;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pdf-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), docType: newDocType }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowCreate(false);
        setNewName("");
        setNewDocType("invoice");
        fetchData();
      } else if (data.error === "upgrade_required") {
        setError(`Upgrade to ${getPlanLabel(getUnlockingPlan("feature_pdf_templates"))} to use PDF templates`);
      } else if (data.error === "duplicate_name") {
        setError("A template with this name already exists for this document type");
      } else {
        setError(data.error || "Failed to create template");
      }
    } catch {
      setError("Failed to create template");
    } finally {
      setCreating(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/pdf-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (data.ok) fetchData();
    } catch {
      setError("Failed to set default");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template and all its versions? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/pdf-templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) fetchData();
    } catch {
      setError("Failed to delete template");
    }
  };

  // Group templates by docType
  const grouped = DOC_TYPES.reduce<Record<string, PdfTemplate[]>>((acc, dt) => {
    acc[dt] = templates.filter(t => t.docType === dt);
    return acc;
  }, {});

  return (
    <AdminSettingsShell title="PDF Templates" subtitle="Customise PDF layouts for your documents">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : !canUseTemplates ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <FileText className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">PDF Template Editor</h3>
          <p className="text-[var(--muted-foreground)] mb-4">
            Create custom PDF layouts for your invoices, quotes, certificates and more.
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Upgrade to <span className="font-semibold">{getPlanLabel(getUnlockingPlan("feature_pdf_templates"))}</span> to unlock this feature.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 mb-4 text-sm text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
              {error}
              <button onClick={() => setError("")} className="ml-2 underline">dismiss</button>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Your Templates</h3>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>

          {showCreate && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6">
              <h4 className="font-semibold mb-3">Create New Template</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[var(--muted-foreground)] mb-1">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. My Custom Invoice"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--muted-foreground)] mb-1">Document Type</label>
                  <select
                    value={newDocType}
                    onChange={e => setNewDocType(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  >
                    {DOC_TYPES.map(dt => (
                      <option key={dt} value={dt}>{DOC_TYPE_LABELS[dt]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newName.trim()}
                    className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <FileText className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
              <p className="text-[var(--muted-foreground)]">No templates yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {DOC_TYPES.map(dt => {
                const dtTemplates = grouped[dt];
                if (!dtTemplates || dtTemplates.length === 0) return null;
                return (
                  <div key={dt}>
                    <h4 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                      {DOC_TYPE_LABELS[dt]}
                    </h4>
                    <div className="space-y-2">
                      {dtTemplates.map(t => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[var(--muted-foreground)]" />
                            <div>
                              <Link
                                href={`/admin/settings/pdf-templates/${t.id}`}
                                className="text-sm font-medium hover:underline"
                              >
                                {t.name}
                              </Link>
                              <div className="text-xs text-[var(--muted-foreground)]">
                                {t.versions.length} version{t.versions.length !== 1 ? "s" : ""}
                                {t.versions[0] && ` \u00B7 Last updated ${new Date(t.versions[0].createdAt).toLocaleDateString("en-GB")}`}
                              </div>
                            </div>
                            {t.isDefault && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium dark:bg-amber-900/30 dark:text-amber-300">
                                <Star className="w-3 h-3" /> Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!t.isDefault && (
                              <button
                                onClick={() => handleSetDefault(t.id)}
                                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition px-2 py-1"
                                title="Set as default"
                              >
                                Set default
                              </button>
                            )}
                            <Link
                              href={`/admin/settings/pdf-templates/${t.id}`}
                              className="text-xs text-[var(--primary)] hover:underline px-2 py-1"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="text-xs text-red-500 hover:text-red-700 transition px-2 py-1"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </AdminSettingsShell>
  );
}
