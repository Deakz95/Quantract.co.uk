"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import { Check, Plus, AlertCircle } from "lucide-react";

type ChecklistItem = {
  id: string;
  title: string;
  description?: string;
  isRequired: boolean;
  sortOrder: number;
  status: string;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  notes?: string;
};

type JobChecklist = {
  id: string;
  title: string;
  description?: string;
  attachedAt: string;
  attachedBy?: string;
  items: ChecklistItem[];
};

type ChecklistTemplate = {
  id: string;
  title: string;
  description?: string;
  items: Array<{
    title: string;
    description?: string;
    isRequired: boolean;
  }>;
};

export function JobChecklistsCard({ jobId }: { jobId: string }) {
  const { toast } = useToast();

  const [checklists, setChecklists] = useState<JobChecklist[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [attaching, setAttaching] = useState(false);

  const load = useCallback(async () => {
    try {
      const [checklistsData, templatesData] = await Promise.all([
        apiRequest<{ ok: boolean; checklists: JobChecklist[] }>(`/api/jobs/${jobId}/checklists`, {
          cache: "no-store",
        }),
        apiRequest<{ ok: boolean; templates: ChecklistTemplate[] }>(`/api/admin/checklist-templates`, {
          cache: "no-store",
        }),
      ]);

      if (checklistsData.ok) {
        setChecklists(checklistsData.checklists || []);
      }

      if (templatesData.ok) {
        setTemplates((templatesData.templates || []).filter((t: any) => t.isActive));
      }
    } catch (error) {
      console.error("Failed to load checklists:", error);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const attachTemplate = useCallback(
    async (templateId: string) => {
      setAttaching(true);
      try {
        const res = await apiRequest<{ ok: boolean; error?: string }>(`/api/jobs/${jobId}/checklists`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ templateId }),
        });

        if (!res.ok) throw new Error(res.error || "Failed to attach checklist");

        toast({ title: "Checklist attached", variant: "success" });
        setShowTemplates(false);
        load();
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to attach checklist");
        toast({ title: message, variant: "destructive" });
      } finally {
        setAttaching(false);
      }
    },
    [jobId, toast, load]
  );

  const toggleItem = useCallback(
    async (checklistId: string, itemId: string, currentStatus: string) => {
      const newStatus = currentStatus === "completed" ? "pending" : "completed";

      try {
        const res = await apiRequest<{ ok: boolean; error?: string }>(
          `/api/jobs/${jobId}/checklists/${checklistId}/items/${itemId}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          }
        );

        if (!res.ok) throw new Error(res.error || "Failed to update item");

        toast({
          title: newStatus === "completed" ? "Item completed" : "Item reopened",
          variant: "success",
        });

        load();
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to update item");
        toast({ title: message, variant: "destructive" });
      }
    },
    [jobId, toast, load]
  );

  if (loading) return <Card><CardContent className="p-6">Loading checklists...</CardContent></Card>;

  const incompleteRequiredCount = checklists.reduce((acc, checklist) => {
    return (
      acc +
      checklist.items.filter((item) => item.isRequired && item.status !== "completed").length
    );
  }, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Compliance Checklists</CardTitle>
            {incompleteRequiredCount > 0 && (
              <div className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {incompleteRequiredCount} required item{incompleteRequiredCount !== 1 ? "s" : ""}{" "}
                incomplete
              </div>
            )}
          </div>
          <Button size="sm" onClick={() => setShowTemplates(!showTemplates)}>
            <Plus className="w-4 h-4 mr-1" />
            Attach Checklist
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showTemplates && (
          <div className="mb-4 p-4 border rounded bg-gray-50">
            <h4 className="font-medium mb-2">Select a template</h4>
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-gray-600">No active templates available</p>
              ) : (
                templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => attachTemplate(template.id)}
                    disabled={attaching}
                    className="w-full text-left p-3 border rounded hover:border-blue-500 hover:bg-white transition-colors"
                  >
                    <div className="font-medium">{template.title}</div>
                    {template.description && (
                      <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {template.items.length} item{template.items.length !== 1 ? "s" : ""}
                    </div>
                  </button>
                ))
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowTemplates(false)}
              className="mt-2"
            >
              Cancel
            </Button>
          </div>
        )}

        {checklists.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No checklists attached yet</p>
            <p className="text-sm mt-1">Attach a checklist to enforce compliance requirements</p>
          </div>
        ) : (
          <div className="space-y-6">
            {checklists.map((checklist) => {
              const completed = checklist.items.filter((i) => i.status === "completed").length;
              const total = checklist.items.length;
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <div key={checklist.id} className="border rounded p-4">
                  <div className="mb-3">
                    <h4 className="font-medium">{checklist.title}</h4>
                    {checklist.description && (
                      <p className="text-sm text-gray-600 mt-1">{checklist.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {completed}/{total}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {checklist.items.map((item) => {
                      const isCompleted = item.status === "completed";

                      return (
                        <div
                          key={item.id}
                          className={`border rounded p-3 transition-colors ${
                            isCompleted ? "bg-green-50 border-green-200" : "bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleItem(checklist.id, item.id, item.status)}
                              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
                                isCompleted
                                  ? "bg-green-500 border-green-500"
                                  : "border-gray-300 hover:border-green-500"
                              }`}
                            >
                              {isCompleted && <Check className="w-3 h-3 text-white" />}
                            </button>

                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className={isCompleted ? "line-through text-gray-600" : ""}>
                                  {item.title}
                                </div>
                                {item.isRequired && (
                                  <Badge variant="secondary" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>

                              {item.description && (
                                <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                              )}

                              {isCompleted && item.completedByName && (
                                <div className="text-xs text-gray-500 mt-2">
                                  Completed by {item.completedByName} on{" "}
                                  {new Date(item.completedAt!).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
