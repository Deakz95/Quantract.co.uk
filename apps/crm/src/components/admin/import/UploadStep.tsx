"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/FileUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface UploadResult {
  fileKey: string;
  fileName: string;
  headers: string[];
  previewRows: string[][];
  totalRows: number;
}

interface UploadStepProps {
  entityType: "contact" | "client" | "deal";
  onUploadComplete: (result: UploadResult) => void;
}

export function UploadStep({ entityType, onUploadComplete }: UploadStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/import/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Upload failed");
      }

      const result: UploadResult = {
        fileKey: data.fileKey,
        fileName: data.fileName,
        headers: data.headers,
        previewRows: data.previewRows,
        totalRows: data.totalRows,
      };

      setUploadResult(result);
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinue = () => {
    if (uploadResult) {
      onUploadComplete(uploadResult);
    }
  };

  const entityLabels = {
    contact: "Contacts",
    client: "Clients",
    deal: "Deals",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Your File</CardTitle>
          <CardDescription>
            Upload a CSV or Excel file containing your {entityLabels[entityType].toLowerCase()} data.
            The first row should contain column headers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            accept=".csv,.xlsx,.xls"
            maxSize={10 * 1024 * 1024}
            onFileSelect={handleFileSelect}
            disabled={isUploading}
          />

          {isUploading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
              Uploading and analyzing file...
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
              <CardTitle>File Analyzed</CardTitle>
            </div>
            <CardDescription>
              Found {uploadResult.totalRows} rows with {uploadResult.headers.length} columns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
                  Detected Columns:
                </p>
                <div className="flex flex-wrap gap-2">
                  {uploadResult.headers.map((header, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-medium text-[var(--foreground)]"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
                  Preview (first {uploadResult.previewRows.length} rows):
                </p>
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--muted)]">
                      <tr>
                        {uploadResult.headers.map((header, index) => (
                          <th
                            key={index}
                            className="whitespace-nowrap px-3 py-2 text-left font-medium text-[var(--foreground)]"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.previewRows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="border-t border-[var(--border)]"
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="whitespace-nowrap px-3 py-2 text-[var(--muted-foreground)]"
                            >
                              {cell || <span className="text-[var(--muted-foreground)]/50">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleContinue}>
                  Continue to Mapping
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
