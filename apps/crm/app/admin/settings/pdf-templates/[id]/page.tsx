"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { PdfTemplateEditor } from "@/components/admin/PdfTemplateEditor";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type PdfTemplateVersion = { id: string; version: number; layout: any; createdAt: string };
type PdfTemplate = {
  id: string;
  docType: string;
  name: string;
  isDefault: boolean;
  versions: PdfTemplateVersion[];
};

export default function PdfTemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [template, setTemplate] = useState<PdfTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/pdf-templates/${id}`);
      const data = await res.json();
      if (data.ok) {
        setTemplate(data.template);
      } else {
        setError(data.error || "Template not found");
      }
    } catch {
      setError("Failed to load template");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleSave = async (layout: any) => {
    try {
      const res = await fetch(`/api/admin/pdf-templates/${id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchTemplate();
        return true;
      } else {
        setError(data.details || data.error || "Failed to save");
        return false;
      }
    } catch {
      setError("Failed to save");
      return false;
    }
  };

  const handlePreview = async (layout: any): Promise<string | null> => {
    try {
      const res = await fetch(`/api/admin/pdf-templates/${id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      });
      if (!res.ok) return null;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  };

  return (
    <AdminSettingsShell
      title={template?.name || "Template Editor"}
      subtitle={template ? `${template.docType} template` : undefined}
    >
      <Link
        href="/admin/settings/pdf-templates"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to templates
      </Link>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 mb-4 text-sm text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : !template ? (
        <p className="text-[var(--muted-foreground)]">Template not found.</p>
      ) : (
        <PdfTemplateEditor
          template={template}
          onSave={handleSave}
          onPreview={handlePreview}
        />
      )}
    </AdminSettingsShell>
  );
}
