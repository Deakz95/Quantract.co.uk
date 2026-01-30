"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import { Plus, Check, Clock, AlertCircle } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
  Assignee?: { id: string; name?: string; email: string };
  Creator?: { id: string; name?: string; email: string };
  Job?: { id: string; title?: string };
  Client?: { id: string; name: string };
  Subtasks?: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  Comments?: Array<{
    id: string;
    content: string;
    internalOnly: boolean;
  }>;
};

export default function TasksPageClient() {
  const { toast } = useToast();
  const loadedRef = useRef(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<"all" | "my" | "internal">("my");

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await apiRequest<{ ok: boolean; tasks: Task[]; error?: string }>(
        `/api/tasks?view=${view}`,
        { cache: "no-store" }
      );

      if (!data.ok) throw new Error(data.error || "Failed to load tasks");

      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (error: any) {
      const message = getApiErrorMessage(error, "Unable to load tasks");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  useEffect(() => {
    load();
  }, [view]);

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const res = await apiRequest<{ ok: boolean; error?: string }>("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          priority: newPriority,
        }),
      });

      if (!res.ok) throw new Error(res.error || "Failed to create task");

      toast({ title: "Task created", variant: "success" });

      setNewTitle("");
      setNewDescription("");
      setNewPriority("medium");
      setShowCreate(false);
      load();
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to create task");
      toast({ title: message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }, [newTitle, newDescription, newPriority, toast, load]);

  const toggleStatus = useCallback(
    async (taskId: string, currentStatus: string) => {
      const newStatus = currentStatus === "done" ? "todo" : "done";

      try {
        const res = await apiRequest<{ ok: boolean; error?: string }>(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) throw new Error(res.error || "Failed to update task");

        toast({ title: "Task updated", variant: "success" });
        load();
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to update task");
        toast({ title: message, variant: "destructive" });
      }
    },
    [toast, load]
  );

  if (loading && !loadedRef.current) return <LoadingSkeleton />;
  if (loadError) return <ErrorState description={loadError} onRetry={load} />;

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <Check className="w-4 h-4 text-green-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const todoTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div>
      {/* View Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={view === "my" ? "default" : "secondary"}
          onClick={() => setView("my")}
        >
          My Tasks
        </Button>
        <Button
          variant={view === "all" ? "default" : "secondary"}
          onClick={() => setView("all")}
        >
          All Tasks
        </Button>
        <Button
          variant={view === "internal" ? "default" : "secondary"}
          onClick={() => setView("internal")}
        >
          Internal
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {view === "my" && "My Tasks"}
              {view === "all" && "All Tasks"}
              {view === "internal" && "Internal Tasks"}
            </CardTitle>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="w-4 h-4 mr-1" />
              New Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreate && (
            <div className="mb-4 p-4 border rounded bg-gray-50">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Task title"
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Task description (supports @mentions)"
                    className="w-full px-3 py-2 border rounded"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating ? "Creating..." : "Create Task"}
                  </Button>
                  <Button variant="secondary" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              actionLabel="Create Task"
              onAction={() => setShowCreate(true)}
            />
          ) : (
            <div className="space-y-6">
              {/* Active Tasks */}
              {todoTasks.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Active ({todoTasks.length})</h3>
                  <div className="space-y-2">
                    {todoTasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded p-4 hover:border-blue-500 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleStatus(task.id, task.status)}
                            className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-1 hover:border-blue-500"
                          >
                            {task.status === "done" && <Check className="w-3 h-3" />}
                          </button>

                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-medium">{task.title}</div>
                              <div className="flex items-center gap-2">
                                <Badge className={priorityColor(task.priority)}>
                                  {task.priority}
                                </Badge>
                                {statusIcon(task.status)}
                              </div>
                            </div>

                            {task.description && (
                              <div className="text-sm text-gray-600 mt-1">{task.description}</div>
                            )}

                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              {task.Assignee && (
                                <span>
                                  Assigned to: {task.Assignee.name || task.Assignee.email}
                                </span>
                              )}
                              {task.Job && <span>Job: {task.Job.title || `#${task.Job.id.slice(0, 8)}`}</span>}
                              {task.Client && <span>Client: {task.Client.name}</span>}
                              {task.Subtasks && task.Subtasks.length > 0 && (
                                <span>
                                  {task.Subtasks.filter((s) => s.status === "done").length}/
                                  {task.Subtasks.length} subtasks
                                </span>
                              )}
                              {task.Comments && task.Comments.length > 0 && (
                                <span>{task.Comments.length} comments</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {doneTasks.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Completed ({doneTasks.length})</h3>
                  <div className="space-y-2">
                    {doneTasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded p-4 bg-gray-50 opacity-75"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleStatus(task.id, task.status)}
                            className="flex-shrink-0 w-5 h-5 rounded border-2 bg-green-500 border-green-500 flex items-center justify-center mt-1"
                          >
                            <Check className="w-3 h-3 text-white" />
                          </button>

                          <div className="flex-1">
                            <div className="font-medium line-through text-gray-600">
                              {task.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
