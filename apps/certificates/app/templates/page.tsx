"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@quantract/ui";
import { FileText, Plus, ChevronRight, Loader2 } from "lucide-react";

type PdfTemplate = {
  id: string;
  docType: string;
  name: string;
  isDefault: boolean;
  versions: { id: string; version: number; createdAt: string }[];
};

const CRM_API_BASE = process.env.NEXT_PUBLIC_CRM_API_URL || "";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${CRM_API_BASE}/api/admin/pdf-templates?docType=certificate`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setTemplates(json.templates ?? json.data ?? []);
      } catch (err: any) {
        setError(err?.message || "Failed to load templates");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Certificate Templates</h1>
              <p className="text-xs text-[var(--muted-foreground)]">
                Manage PDF templates for certificate generation
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && templates.length === 0 && (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
            <h2 className="text-lg font-semibold mb-2">No certificate templates</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Create a template in the CRM admin to get started with custom certificate layouts.
            </p>
          </div>
        )}

        {!loading && !error && templates.length > 0 && (
          <div className="space-y-3">
            {templates.map((t) => (
              <Link key={t.id} href={`/templates/${t.id}`}>
                <Card className="hover:border-[var(--primary)]/50 transition cursor-pointer">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <h3 className="font-medium">{t.name}</h3>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {t.versions.length} version{t.versions.length !== 1 ? "s" : ""}
                          {t.isDefault && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 text-[10px] font-medium">
                              Default
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)]" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
