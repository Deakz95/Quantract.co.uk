"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Loader2, Clock, RotateCcw } from "lucide-react";
import { TemplateEditor, type PdfTemplate } from "../../../components/TemplateEditor";
import type { LayoutElement } from "../../../components/TemplateEditor";

const CRM_API_BASE = process.env.NEXT_PUBLIC_CRM_API_URL || "";

export default function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [template, setTemplate] = useState<PdfTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${CRM_API_BASE}/api/admin/pdf-templates/${id}`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setTemplate(json.template ?? json);
      } catch (err: any) {
        setError(err?.message || "Failed to load template");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSave = async (layout: LayoutElement[]): Promise<boolean> => {
    try {
      const res = await fetch(
        `${CRM_API_BASE}/api/admin/pdf-templates/${id}/versions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout }),
        },
      );
      if (!res.ok) return false;
      const json = await res.json();
      // Update template with new version
      if (template && json.version) {
        setTemplate({
          ...template,
          versions: [json.version, ...template.versions],
        });
      }
      return true;
    } catch {
      return false;
    }
  };

  const handlePreview = async (layout: LayoutElement[]): Promise<string | null> => {
    try {
      const res = await fetch(
        `${CRM_API_BASE}/api/admin/pdf-templates/${id}/preview`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layout }),
        },
      );
      if (!res.ok) return null;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!template) return;
    const version = template.versions.find((v) => v.id === versionId);
    if (!version) return;

    // Save the old version's layout as a new version (rollback = create new version with old layout)
    const ok = await handleSave(version.layout as LayoutElement[]);
    if (ok) {
      // Reload template to get fresh data
      try {
        const res = await fetch(
          `${CRM_API_BASE}/api/admin/pdf-templates/${id}`,
          { credentials: "include" },
        );
        if (res.ok) {
          const json = await res.json();
          setTemplate(json.template ?? json);
        }
      } catch {
        // non-fatal
      }
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
      </main>
    );
  }

  if (error || !template) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Template not found"}</p>
          <Link
            href="/templates"
            className="text-[var(--primary)] hover:underline text-sm"
          >
            Back to templates
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/templates"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">{template.name}</h1>
              <p className="text-xs text-[var(--muted-foreground)]">
                Template Editor &bull; {template.docType}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--card)] transition"
          >
            <Clock className="w-4 h-4" />
            Versions ({template.versions.length})
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {showVersions && (
          <div className="mb-6 p-4 border border-[var(--border)] rounded-xl bg-[var(--card)]">
            <h3 className="text-sm font-semibold mb-3">Version History</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {template.versions.map((v, i) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--background)] text-sm"
                >
                  <div>
                    <span className="font-medium">v{v.version}</span>
                    <span className="ml-2 text-[var(--muted-foreground)]">
                      {new Date(v.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {i === 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[10px] font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  {i > 0 && (
                    <button
                      onClick={() => handleRollback(v.id)}
                      className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Rollback
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <TemplateEditor
          template={template}
          onSave={handleSave}
          onPreview={handlePreview}
        />
      </div>
    </main>
  );
}
