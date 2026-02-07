'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Trash2, AlertTriangle, FileText, Clock, ChevronLeft, ChevronRight } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type DocFile = {
  id: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  originalFilename: string | null;
  createdAt: string;
  storageProvider: string;
};

type TypeBreakdown = {
  type: string;
  count: number;
  totalBytes: number;
};

type InsightsData = {
  largestFiles: DocFile[];
  oldFiles: DocFile[];
  typeBreakdown: TypeBreakdown[];
  totalCount: number;
  olderThanDays: number;
};

type DeleteTarget = {
  id: string;
  filename: string;
  sizeBytes: number;
} | null;

type BulkDeleteState = {
  open: boolean;
  force: boolean;
};

const PAGE_SIZE = 20;

export default function StorageInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InsightsData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Pagination state for largest files
  const [offset, setOffset] = useState(0);

  // Single-delete confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleteRefs, setDeleteRefs] = useState<string[] | null>(null);
  const [deleteForceConfirm, setDeleteForceConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Bulk delete confirm dialog state
  const [bulkConfirm, setBulkConfirm] = useState<BulkDeleteState>({ open: false, force: false });

  const fetchInsights = useCallback((pageOffset = 0) => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/storage/insights?limit=${PAGE_SIZE}&offset=${pageOffset}`)
      .then(r => r.json())
      .then((res) => {
        if (res.ok) {
          setData(res);
        } else {
          setError(res.error || "Failed to load insights.");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Network error loading insights.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchInsights(offset);
  }, [fetchInsights, offset]);

  // --- Single document delete flow ---
  const initiateDelete = async (file: DocFile) => {
    setDeleteTarget({ id: file.id, filename: file.originalFilename || file.id, sizeBytes: file.sizeBytes });
    setDeleteRefs(null);
    setDeleteForceConfirm(false);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setMessage(null);

    try {
      // First attempt without force to check for references
      const forceParam = deleteForceConfirm ? "?force=true" : "";
      const res = await fetch(`/api/admin/storage/documents/${deleteTarget.id}${forceParam}`, { method: 'DELETE' });
      const result = await res.json();

      if (result.ok) {
        setMessage({ type: "success", text: `Archived "${deleteTarget.filename}" — ${formatBytes(result.bytesFreed)} freed.` });
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            largestFiles: prev.largestFiles.filter((f) => f.id !== deleteTarget.id),
            oldFiles: prev.oldFiles.filter((f) => f.id !== deleteTarget.id),
            totalCount: prev.totalCount - 1,
          };
        });
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.id);
          return next;
        });
        setDeleteTarget(null);
        setDeleteRefs(null);
        setDeleteForceConfirm(false);
      } else if (result.error === "has_references" && !deleteForceConfirm) {
        // Show references and ask for force confirmation
        setDeleteRefs(result.references || []);
        setDeleteBusy(false);
        return; // Keep dialog open for force confirmation
      } else {
        setMessage({ type: "error", text: result.error === "has_references"
          ? `Cannot delete: referenced by ${result.references?.join(", ")}.`
          : (result.error || "Delete failed.") });
        setDeleteTarget(null);
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteRefs(null);
    setDeleteForceConfirm(false);
  };

  // --- Bulk delete flow ---
  const initiateBulkDelete = () => {
    if (selected.size === 0) return;
    setBulkConfirm({ open: true, force: false });
  };

  const executeBulkDelete = async () => {
    setBulkDeleting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/storage/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: Array.from(selected), force: bulkConfirm.force }),
      });
      const result = await res.json();
      if (result.ok) {
        const deletedIds = new Set(result.results.filter((r: any) => r.ok).map((r: any) => r.id));
        const skippedRefs = result.results.filter((r: any) => r.error === "has_references");
        let msg = `Archived ${result.deletedCount} document(s) — ${formatBytes(result.totalBytesFreed)} freed.`;
        if (skippedRefs.length > 0) {
          msg += ` ${skippedRefs.length} skipped (have active references).`;
        }
        setMessage({ type: result.deletedCount > 0 ? "success" : "error", text: msg });
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            largestFiles: prev.largestFiles.filter((f) => !deletedIds.has(f.id)),
            oldFiles: prev.oldFiles.filter((f) => !deletedIds.has(f.id)),
            totalCount: prev.totalCount - result.deletedCount,
          };
        });
        setSelected(new Set());
      } else {
        setMessage({ type: "error", text: result.error || "Bulk cleanup failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setBulkDeleting(false);
      setBulkConfirm({ open: false, force: false });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Pagination helpers
  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const renderFileRow = (file: DocFile, showCheckbox: boolean) => (
    <div key={file.id} className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected.has(file.id)}
          onChange={() => toggleSelect(file.id)}
          className="h-4 w-4 rounded border-[var(--border)]"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)] truncate">
          {file.originalFilename || file.id}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          <span className="capitalize">{file.type.replace(/_/g, ' ')}</span>
          {' · '}{file.mimeType}
          {' · '}{formatDate(file.createdAt)}
        </p>
      </div>
      <span className="text-sm font-medium text-[var(--foreground)] whitespace-nowrap">
        {formatBytes(file.sizeBytes)}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => initiateDelete(file)}
        disabled={deleting.has(file.id)}
        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <AdminSettingsShell title="Storage Insights" subtitle="Identify and clean up unused storage">
      <div className="space-y-6 max-w-3xl">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading insights...
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-[var(--muted-foreground)] mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchInsights(offset)}>
              Retry
            </Button>
          </div>
        ) : data ? (
          <>
            {/* Status message */}
            {message && (
              <div className={`p-4 rounded-lg border ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
              }`}>
                <p className={`text-sm font-medium ${
                  message.type === "success" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                }`}>
                  {message.text}
                </p>
              </div>
            )}

            {/* Bulk actions bar */}
            {selected.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-[var(--muted)] rounded-lg">
                <span className="text-sm text-[var(--foreground)]">
                  {selected.size} document(s) selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={initiateBulkDelete}
                  disabled={bulkDeleting}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {bulkDeleting ? "Archiving..." : "Archive Selected"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}

            {/* Type breakdown summary */}
            {data.typeBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>Storage by Type</CardTitle>
                      <CardDescription>{data.totalCount} total documents</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.typeBreakdown.map((item) => (
                      <div key={item.type} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--foreground)] font-medium capitalize">
                            {item.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[var(--muted-foreground)]">
                            ({item.count} {item.count === 1 ? 'file' : 'files'})
                          </span>
                        </div>
                        <span className="font-medium text-[var(--foreground)]">{formatBytes(item.totalBytes)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Largest files */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Largest Files</CardTitle>
                    <CardDescription>Files consuming the most storage</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {data.largestFiles.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No documents found.</p>
                ) : (
                  <>
                    <div className="divide-y divide-[var(--border)]">
                      {data.largestFiles.map((file) => renderFileRow(file, true))}
                    </div>
                    {/* Pagination controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Page {currentPage} of {totalPages} ({data.totalCount} files)
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={offset === 0}
                            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={offset + PAGE_SIZE >= data.totalCount}
                            onClick={() => setOffset(offset + PAGE_SIZE)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Old files */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-500 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Old Files</CardTitle>
                    <CardDescription>Documents older than {data.olderThanDays} days</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {data.oldFiles.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No old documents found.</p>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {data.oldFiles.map((file) => renderFileRow(file, true))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info notice */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Deleting documents here performs a soft-delete (archive). The document is excluded from storage calculations immediately.
                Underlying files are retained for safety and can be recovered if needed. The reconciliation job will verify totals periodically.
              </p>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            Failed to load storage insights.
          </div>
        )}
      </div>

      {/* Single delete confirm dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteRefs ? "Document Has Active References" : "Archive Document"}
        message={
          deleteRefs
            ? `This document is referenced by: ${deleteRefs.join(", ")}. Archiving it may leave broken references. Are you sure you want to proceed?`
            : `Archive "${deleteTarget?.filename}"? This soft-deletes the document and frees ${deleteTarget ? formatBytes(deleteTarget.sizeBytes) : ""} of storage.`
        }
        confirmLabel={deleteRefs ? "Archive Anyway" : "Archive"}
        confirmVariant="destructive"
        onConfirm={() => {
          if (deleteRefs && !deleteForceConfirm) {
            setDeleteForceConfirm(true);
            executeDelete();
          } else {
            executeDelete();
          }
        }}
        onCancel={cancelDelete}
        busy={deleteBusy}
      />

      {/* Bulk delete confirm dialog */}
      <ConfirmDialog
        open={bulkConfirm.open}
        title="Archive Selected Documents"
        message={`Archive ${selected.size} document(s)? Documents with active references will be skipped unless you check the option below.`}
        confirmLabel={bulkDeleting ? "Archiving..." : "Archive Selected"}
        confirmVariant="destructive"
        onConfirm={executeBulkDelete}
        onCancel={() => setBulkConfirm({ open: false, force: false })}
        busy={bulkDeleting}
      >
        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={bulkConfirm.force}
            onChange={(e) => setBulkConfirm((prev) => ({ ...prev, force: e.target.checked }))}
            className="h-4 w-4 rounded border-[var(--border)]"
          />
          <span className="text-sm text-[var(--muted-foreground)]">
            Also archive documents with active references (may break links)
          </span>
        </label>
      </ConfirmDialog>
    </AdminSettingsShell>
  );
}
