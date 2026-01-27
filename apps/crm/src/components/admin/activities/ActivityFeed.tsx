"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, createAbortController, getApiErrorMessage, isAbortError, requireOk } from "@/lib/apiClient";
import { ActivityItem, type Activity } from "./ActivityItem";
import { ActivityForm } from "./ActivityForm";
import { Plus, X } from "lucide-react";

type ActivityFeedProps = {
  entityType: "contact" | "deal" | "client" | "job";
  entityId: string;
  title?: string;
  showAddButton?: boolean;
  compact?: boolean;
};

export function ActivityFeed({
  entityType,
  entityId,
  title = "Activity",
  showAddButton = true,
  compact = false,
}: ActivityFeedProps) {
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const queryParam = `${entityType}Id`;

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = createAbortController();
    abortRef.current = controller;

    setLoading(true);
    setLoadError(null);

    try {
      const data = await apiRequest<{
        ok: boolean;
        activities: Activity[];
        total: number;
        error?: string;
      }>(`/api/admin/activities?${queryParam}=${entityId}&limit=50`, {
        cache: "no-store",
        signal: controller.signal,
      });
      requireOk(data);
      setActivities(Array.isArray(data.activities) ? data.activities : []);
      setTotal(data.total || 0);
    } catch (error) {
      if (isAbortError(error)) return;
      setLoadError(getApiErrorMessage(error, "Unable to load activities"));
    } finally {
      setLoading(false);
    }
  }, [entityId, queryParam]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  const handleSuccess = useCallback(
    (_activity: Activity) => {
      setShowForm(false);
      setEditingActivity(null);
      void load();
    },
    [load]
  );

  const handleEdit = useCallback((activity: Activity) => {
    setEditingActivity(activity);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((activity: Activity) => {
    setDeletingActivity(activity);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingActivity) return;

    setDeleting(true);
    try {
      const data = await apiRequest<{ ok: boolean; error?: string }>(
        `/api/admin/activities/${deletingActivity.id}`,
        { method: "DELETE" }
      );
      requireOk(data, "Delete failed");
      toast({ title: "Activity deleted", variant: "success" });
      void load();
    } catch (err) {
      toast({ title: getApiErrorMessage(err, "Could not delete activity"), variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeletingActivity(null);
    }
  }, [deletingActivity, toast, load]);

  const cancelForm = useCallback(() => {
    setShowForm(false);
    setEditingActivity(null);
  }, []);

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Compact header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[var(--foreground)]">{title}</h4>
          {showAddButton && !showForm && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(true)}
              className="h-7 px-2"
            >
              <Plus size={14} className="mr-1" />
              Add
            </Button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="border border-[var(--border)] rounded-lg p-3 bg-[var(--background)]">
            <ActivityForm
              entityType={entityType}
              entityId={entityId}
              activity={editingActivity}
              onSuccess={handleSuccess}
              onCancel={cancelForm}
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <LoadingSkeleton className="h-16" />
        ) : loadError ? (
          <ErrorState title="Error" description={loadError} onRetry={load} />
        ) : activities.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">No activity yet</p>
        ) : (
          <div className="space-y-1">
            {activities.slice(0, 5).map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onEdit={handleEdit}
                onDelete={handleDelete}
                showEntityLinks={false}
              />
            ))}
            {activities.length > 5 && (
              <p className="text-xs text-[var(--muted-foreground)] text-center py-2">
                +{activities.length - 5} more activities
              </p>
            )}
          </div>
        )}

        {/* Delete confirmation */}
        <ConfirmDialog
          open={Boolean(deletingActivity)}
          title="Delete activity?"
          description={`Are you sure you want to delete "${deletingActivity?.subject}"? This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setDeletingActivity(null)}
          onConfirm={confirmDelete}
          busy={deleting}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            {showAddButton && !showForm && (
              <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
                <Plus size={16} className="mr-1" />
                Add Activity
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Form */}
        {showForm && (
          <div className="mb-6 border border-[var(--border)] rounded-lg p-4 bg-[var(--muted)]/30">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-[var(--foreground)]">
                {editingActivity ? "Edit Activity" : "New Activity"}
              </h4>
              <button
                type="button"
                onClick={cancelForm}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X size={18} />
              </button>
            </div>
            <ActivityForm
              entityType={entityType}
              entityId={entityId}
              activity={editingActivity}
              onSuccess={handleSuccess}
              onCancel={cancelForm}
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <LoadingSkeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <LoadingSkeleton className="h-4 w-1/3" />
                  <LoadingSkeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <ErrorState title="Unable to load activities" description={loadError} onRetry={load} />
        ) : activities.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Add notes, calls, emails, and meetings to track your interactions."
            action={
              showAddButton ? (
                <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
                  <Plus size={16} className="mr-1" />
                  Add first activity
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="relative">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                onEdit={handleEdit}
                onDelete={handleDelete}
                showEntityLinks={false}
              />
            ))}
            {total > activities.length && (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-4 border-t border-[var(--border)]">
                Showing {activities.length} of {total} activities
              </p>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deletingActivity)}
        title="Delete activity?"
        description={`Are you sure you want to delete "${deletingActivity?.subject}"? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setDeletingActivity(null)}
        onConfirm={confirmDelete}
        busy={deleting}
      />
    </Card>
  );
}
