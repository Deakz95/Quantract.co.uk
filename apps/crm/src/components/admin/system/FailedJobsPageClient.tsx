"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import { RefreshCw, X, AlertCircle } from "lucide-react";

type FailedJob = {
  id: string;
  queue: string;
  data: any;
  failedReason: string;
  attemptsMade: number;
  processedOn?: number;
  finishedOn?: number;
};

export default function FailedJobsPageClient() {
  const { toast } = useToast();
  const loadedRef = useRef(false);

  const [jobs, setJobs] = useState<FailedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const [jobToRemove, setJobToRemove] = useState<FailedJob | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await apiRequest<{
        ok: boolean;
        failedJobs: FailedJob[];
        error?: string;
      }>("/api/admin/jobs/failed", {
        cache: "no-store",
      });

      if (!data.ok) throw new Error(data.error || "Failed to load jobs");

      setJobs(Array.isArray(data.failedJobs) ? data.failedJobs : []);
    } catch (error: any) {
      const message = getApiErrorMessage(error, "Unable to load failed jobs");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  const handleRetry = useCallback(
    async (job: FailedJob) => {
      setRetrying((prev) => ({ ...prev, [job.id]: true }));

      try {
        const res = await apiRequest<{ ok: boolean; error?: string }>(
          "/api/admin/jobs/failed",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "retry",
              jobId: job.id,
              queue: job.queue,
            }),
          }
        );

        if (!res.ok) throw new Error(res.error || "Failed to retry job");

        toast({ title: "Job queued for retry", variant: "success" });
        load();
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to retry job");
        toast({ title: message, variant: "destructive" });
      } finally {
        setRetrying((prev) => ({ ...prev, [job.id]: false }));
      }
    },
    [toast, load]
  );

  const requestRemove = useCallback((job: FailedJob) => {
    setJobToRemove(job);
  }, []);

  const handleRemove = useCallback(
    async () => {
      if (!jobToRemove) return;
      setRemoving(true);

      try {
        const res = await apiRequest<{ ok: boolean; error?: string }>(
          "/api/admin/jobs/failed",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "remove",
              jobId: jobToRemove.id,
              queue: jobToRemove.queue,
            }),
          }
        );

        if (!res.ok) throw new Error(res.error || "Failed to remove job");

        toast({ title: "Job removed", variant: "success" });
        load();
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to remove job");
        toast({ title: message, variant: "destructive" });
      } finally {
        setRemoving(false);
        setJobToRemove(null);
      }
    },
    [jobToRemove, toast, load]
  );

  if (loading && !loadedRef.current) return <LoadingSkeleton />;
  if (loadError) return <ErrorState description={loadError} onRetry={load} />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Failed Background Jobs ({jobs.length})</CardTitle>
          <Button size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-green-600">
            <p className="font-medium">No failed jobs</p>
            <p className="text-sm mt-1">All background jobs are processing successfully</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="border rounded p-4 bg-red-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <Badge variant="secondary">{job.queue}</Badge>
                      <span className="text-xs text-gray-500">Job ID: #{job.id.slice(0, 8)}</span>
                    </div>

                    <div className="text-sm mb-2">
                      <div className="font-medium text-red-800">Failed Reason:</div>
                      <div className="text-gray-700">{job.failedReason}</div>
                    </div>

                    <div className="text-xs text-gray-600">
                      <div>Attempts: {job.attemptsMade}</div>
                      {job.finishedOn && (
                        <div>
                          Failed: {new Date(job.finishedOn).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {job.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer">
                          Job Data
                        </summary>
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(job.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRetry(job)}
                      disabled={retrying[job.id]}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      {retrying[job.id] ? "Retrying..." : "Retry"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => requestRemove(job)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Remove Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(jobToRemove)}
        title="Remove failed job?"
        message={jobToRemove ? `This will permanently remove the failed job #${jobToRemove.id.slice(0, 8)} from the queue.` : ""}
        confirmLabel="Remove job"
        onCancel={() => setJobToRemove(null)}
        onConfirm={handleRemove}
        busy={removing}
      />
    </Card>
  );
}
