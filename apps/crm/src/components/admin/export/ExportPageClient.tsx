"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Users, Building2, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";

type ExportType = "contacts" | "clients" | "deals";

interface ExportOption {
  type: ExportType;
  label: string;
  description: string;
  icon: typeof Users;
  endpoint: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    type: "contacts",
    label: "Contacts",
    description: "Export all contacts with names, emails, and phone numbers",
    icon: Users,
    endpoint: "/api/admin/export/contacts",
  },
  {
    type: "clients",
    label: "Clients",
    description: "Export all clients with company details and addresses",
    icon: Building2,
    endpoint: "/api/admin/export/clients",
  },
  {
    type: "deals",
    label: "Deals",
    description: "Export all deals with values, stages, and dates",
    icon: TrendingUp,
    endpoint: "/api/admin/export/deals",
  },
];

export function ExportPageClient() {
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [success, setSuccess] = useState<ExportType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (option: ExportOption) => {
    setExporting(option.type);
    setSuccess(null);
    setError(null);

    try {
      const response = await fetch(option.endpoint);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Export failed");
      }

      // Get the blob and create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${option.type}-export.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(option.type);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to export data");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--error)]/10 p-4 text-[var(--error)]">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORT_OPTIONS.map((option) => (
          <Card key={option.type} variant="interactive">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                  <option.icon className="h-6 w-6 text-[var(--primary)]" />
                </div>
                {success === option.type && (
                  <div className="flex items-center gap-1 text-sm text-[var(--success)]">
                    <CheckCircle2 className="h-4 w-4" />
                    Downloaded
                  </div>
                )}
              </div>
              <CardTitle className="mt-4">{option.label}</CardTitle>
              <CardDescription>{option.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExport(option)}
                disabled={exporting !== null}
                className="w-full"
              >
                {exporting === option.type ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-2 text-sm text-[var(--muted-foreground)]">
            <li>
              Exports include all records for your company - there are no filters applied
            </li>
            <li>
              CSV files can be opened in Excel, Google Sheets, or any spreadsheet application
            </li>
            <li>
              Date fields are formatted in ISO format (YYYY-MM-DD) for compatibility
            </li>
            <li>
              Special characters and formulas are safely escaped to prevent issues
            </li>
            <li>
              Large exports may take a few moments to generate
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
