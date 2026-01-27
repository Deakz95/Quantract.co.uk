"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  RefreshCw,
} from "lucide-react";
import type { ColumnMapping } from "./MappingStep";

interface ImportJob {
  id: string;
  entityType: string;
  fileName: string;
  status: string;
  totalRows: number | null;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors: { row: number; errors: string[] }[] | null;
  createdAt: string;
  completedAt: string | null;
}

interface ProgressStepProps {
  fileKey: string;
  fileName: string;
  mapping: ColumnMapping;
  entityType: "contact" | "client" | "deal";
  onComplete: () => void;
  onStartNew: () => void;
}

export function ProgressStep({
  fileKey,
  fileName,
  mapping,
  entityType,
  onComplete,
  onStartNew,
}: ProgressStepProps) {
  const [isStarting, setIsStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);

  // Start the import
  useEffect(() => {
    const startImport = async () => {
      setIsStarting(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/import/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey, fileName, mapping, entityType }),
        });

        const data = await response.json();

        if (!data.ok) {
          throw new Error(data.error || "Failed to start import");
        }

        setImportId(data.importId);
      } catch (err: any) {
        setError(err.message || "Failed to start import");
      } finally {
        setIsStarting(false);
      }
    };

    startImport();
  }, [fileKey, fileName, mapping, entityType]);

  // Poll for status
  const pollStatus = useCallback(async () => {
    if (!importId) return;

    try {
      const response = await fetch(`/api/admin/import/${importId}/status`);
      const data = await response.json();

      if (data.ok && data.importJob) {
        setImportJob(data.importJob);
      }
    } catch (err) {
      console.error("Failed to poll status:", err);
    }
  }, [importId]);

  useEffect(() => {
    if (!importId) return;

    // Initial poll
    pollStatus();

    // Poll every 2 seconds while processing
    const interval = setInterval(() => {
      if (importJob?.status === "processing" || importJob?.status === "pending") {
        pollStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [importId, importJob?.status, pollStatus]);

  const progress = importJob?.totalRows
    ? Math.round((importJob.processedRows / importJob.totalRows) * 100)
    : 0;

  const isComplete = importJob?.status === "completed" || importJob?.status === "failed";

  const entityLabels = {
    contact: "Contacts",
    client: "Clients",
    deal: "Deals",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isStarting
              ? "Starting Import..."
              : isComplete
              ? "Import Complete"
              : "Importing Data..."}
          </CardTitle>
          <CardDescription>
            {importJob ? `Importing ${entityLabels[entityType]}` : "Please wait..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--error)]/10 p-4 text-[var(--error)]">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : isStarting ? (
            <div className="flex items-center gap-3 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
              <span className="text-sm text-[var(--muted-foreground)]">
                Initializing import...
              </span>
            </div>
          ) : importJob ? (
            <div className="space-y-6">
              {/* Progress bar */}
              {!isComplete && (
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Progress</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {importJob.processedRows} / {importJob.totalRows || "?"}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-center text-sm text-[var(--muted-foreground)]">
                    {progress}% complete
                  </p>
                </div>
              )}

              {/* Results summary */}
              {isComplete && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-[var(--muted)] p-4 text-center">
                    <p className="text-2xl font-bold text-[var(--foreground)]">
                      {importJob.totalRows || importJob.processedRows}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Total Processed
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--success)]/10 p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                      <p className="text-2xl font-bold text-[var(--success)]">
                        {importJob.successCount}
                      </p>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Successfully Imported
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--error)]/10 p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <XCircle className="h-5 w-5 text-[var(--error)]" />
                      <p className="text-2xl font-bold text-[var(--error)]">
                        {importJob.errorCount}
                      </p>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Errors/Skipped
                    </p>
                  </div>
                </div>
              )}

              {/* Status message */}
              {isComplete && importJob.status === "completed" && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--success)]/10 p-4 text-[var(--success)]">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>
                    Import completed! {importJob.successCount} {entityLabels[entityType].toLowerCase()} were imported successfully.
                  </span>
                </div>
              )}

              {isComplete && importJob.status === "failed" && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--error)]/10 p-4 text-[var(--error)]">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <span>
                    Import failed. No records were imported.
                  </span>
                </div>
              )}

              {/* Error details */}
              {isComplete && importJob.errors && importJob.errors.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
                    Errors ({importJob.errors.length}):
                  </p>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {importJob.errors.slice(0, 10).map((errorRow, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/5 p-3"
                      >
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          Row {errorRow.row}
                        </p>
                        <ul className="mt-1 list-inside list-disc text-sm text-[var(--error)]">
                          {errorRow.errors.map((err, errIndex) => (
                            <li key={errIndex}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {importJob.errors.length > 10 && (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        ... and {importJob.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Action buttons */}
      {isComplete && (
        <div className="flex justify-between">
          <Button variant="secondary" onClick={onStartNew}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Start New Import
          </Button>
          <Button onClick={onComplete}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
