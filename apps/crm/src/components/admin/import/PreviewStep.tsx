"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { ColumnMapping } from "./MappingStep";

interface ValidationResult {
  validRows: number;
  totalRows: number;
  errorRows: { row: number; errors: string[] }[];
}

interface PreviewStepProps {
  fileKey: string;
  mapping: ColumnMapping;
  entityType: "contact" | "client" | "deal";
  onValidationComplete: (result: ValidationResult) => void;
  onBack: () => void;
}

export function PreviewStep({
  fileKey,
  mapping,
  entityType,
  onValidationComplete,
  onBack,
}: PreviewStepProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);

  useEffect(() => {
    const validate = async () => {
      setIsValidating(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/import/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey, mapping, entityType }),
        });

        const data = await response.json();

        if (!data.ok) {
          throw new Error(data.error || "Validation failed");
        }

        const result: ValidationResult = {
          validRows: data.validRows,
          totalRows: data.totalRows,
          errorRows: data.errorRows,
        };

        setValidationResult(result);
      } catch (err: any) {
        setError(err.message || "Failed to validate data");
      } finally {
        setIsValidating(false);
      }
    };

    validate();
  }, [fileKey, mapping, entityType]);

  const handleContinue = () => {
    if (validationResult && validationResult.validRows > 0) {
      onValidationComplete(validationResult);
    }
  };

  const entityLabels = {
    contact: "contacts",
    client: "clients",
    deal: "deals",
  };

  const displayedErrors = showAllErrors
    ? validationResult?.errorRows || []
    : (validationResult?.errorRows || []).slice(0, 5);

  const hasMoreErrors =
    validationResult && validationResult.errorRows.length > 5;

  return (
    <div className="space-y-6">
      {/* Validation Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Data Validation</CardTitle>
          <CardDescription>
            Checking your data before import
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isValidating ? (
            <div className="flex items-center gap-3 py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
              <span className="text-sm text-[var(--muted-foreground)]">
                Validating {entityLabels[entityType]}...
              </span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--error)]/10 p-4 text-[var(--error)]">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : validationResult ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-[var(--muted)] p-4">
                  <p className="text-2xl font-bold text-[var(--foreground)]">
                    {validationResult.totalRows}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Total Rows
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--success)]/10 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                    <p className="text-2xl font-bold text-[var(--success)]">
                      {validationResult.validRows}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Valid Rows
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--error)]/10 p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-[var(--error)]" />
                    <p className="text-2xl font-bold text-[var(--error)]">
                      {validationResult.errorRows.length}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Rows with Errors
                  </p>
                </div>
              </div>

              {/* Success message */}
              {validationResult.validRows > 0 && validationResult.errorRows.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--success)]/10 p-4 text-[var(--success)]">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>
                    All {validationResult.validRows} rows are valid and ready to import!
                  </span>
                </div>
              )}

              {/* Partial success message */}
              {validationResult.validRows > 0 && validationResult.errorRows.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--warning)]/10 p-4 text-[var(--warning)]">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>
                    {validationResult.validRows} rows are valid.{" "}
                    {validationResult.errorRows.length} rows have errors and will be skipped.
                  </span>
                </div>
              )}

              {/* Error details */}
              {validationResult.errorRows.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
                    Error Details:
                  </p>
                  <div className="space-y-2">
                    {displayedErrors.map((errorRow, index) => (
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
                  </div>

                  {hasMoreErrors && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllErrors(!showAllErrors)}
                      className="mt-3"
                    >
                      {showAllErrors ? (
                        <>
                          <ChevronUp className="mr-1 h-4 w-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-1 h-4 w-4" />
                          Show All {validationResult.errorRows.length} Errors
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* No valid rows warning */}
              {validationResult.validRows === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--error)]/10 p-4 text-[var(--error)]">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <span>
                    No valid rows found. Please fix the errors and try again.
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Action buttons */}
      {!isValidating && validationResult && (
        <div className="flex justify-between">
          <Button variant="secondary" onClick={onBack}>
            Back to Mapping
          </Button>
          <Button
            onClick={handleContinue}
            disabled={validationResult.validRows === 0}
          >
            Import {validationResult.validRows} {entityLabels[entityType]}
          </Button>
        </div>
      )}
    </div>
  );
}
