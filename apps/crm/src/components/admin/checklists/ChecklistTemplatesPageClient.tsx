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
import { Plus, Check, X } from "lucide-react";

type ChecklistTemplateItem = {
  id?: string;
  title: string;
  description?: string;
  isRequired: boolean;
  sortOrder: number;
};

type ChecklistTemplate = {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  items: ChecklistTemplateItem[];
};

export default function ChecklistTemplatesPageClient() {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newItems, setNewItems] = useState<ChecklistTemplateItem[]>([
    { title: "", description: "", isRequired: true, sortOrder: 0 },
  ]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setLoadError(null);

    try {
      const data = await apiRequest<{ ok: boolean; templates: ChecklistTemplate[]; error?: string }>(
        "/api/admin/checklist-templates",
        {
          cache: "no-store",
          signal: abortRef.current.signal,
        }
      );

      if (!data.ok) throw new Error(data.error || "Failed to load templates");

      const list = Array.isArray(data.templates) ? data.templates : [];
      setTemplates(list);

      setSelectedId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      const message = getApiErrorMessage(error, "Unable to load checklist templates");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [load]);

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    const validItems = newItems.filter((item) => item.title.trim());
    if (validItems.length === 0) {
      toast({ title: "At least one checklist item is required", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const res = await apiRequest<{ ok: boolean; error?: string }>("/api/admin/checklist-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          items: validItems.map((item, idx) => ({
            title: item.title.trim(),
            description: item.description?.trim() || undefined,
            isRequired: item.isRequired,
            sortOrder: idx,
          })),
        }),
      });

      if (!res.ok) throw new Error(res.error || "Failed to create template");

      toast({
        title: "Checklist template created",
        variant: "success",
      });

      // Reset form
      setNewTitle("");
      setNewDescription("");
      setNewItems([{ title: "", description: "", isRequired: true, sortOrder: 0 }]);
      setIsCreating(false);

      load();
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to create template");
      toast({ title: message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }, [newTitle, newDescription, newItems, toast, load]);

  const toggleActive = useCallback(
    async (template: ChecklistTemplate) => {
      try {
        const next = !template.isActive;

        const res = await apiRequest<{ ok: boolean; error?: string }>(
          `/api/admin/checklist-templates/${template.id}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ isActive: next }),
          }
        );

        if (!res.ok) throw new Error(res.error || "Failed to update template");

        toast({
          title: next ? "Template activated" : "Template deactivated",
          variant: "success",
        });

        load();
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to update template");
        toast({ title: message, variant: "destructive" });
      }
    },
    [toast, load]
  );

  const addItem = useCallback(() => {
    setNewItems((prev) => [
      ...prev,
      { title: "", description: "", isRequired: true, sortOrder: prev.length },
    ]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setNewItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback((index: number, field: keyof ChecklistTemplateItem, value: any) => {
    setNewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (loadError) return <ErrorState description={loadError} onRetry={load} />;

  const selectedTemplate = selectedId ? templates.find((t) => t.id === selectedId) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Templates</CardTitle>
              <Button size="sm" onClick={() => setIsCreating(!isCreating)}>
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <EmptyState
                title="No checklist templates yet"
                actionLabel="Create Template"
                onAction={() => setIsCreating(true)}
              />
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedId(template.id)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      selectedId === template.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{template.title}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {template.items.length} item{template.items.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      {!template.isActive && (
                        <Badge variant="secondary" className="ml-2">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail / Create */}
      <div className="lg:col-span-2">
        {isCreating ? (
          <Card>
            <CardHeader>
              <CardTitle>Create Checklist Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Electrical Installation Safety Checklist"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description of when this checklist applies"
                  className="w-full px-3 py-2 border rounded"
                  rows={2}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Checklist Items *</label>
                  <Button size="sm" variant="secondary" onClick={addItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {newItems.map((item, index) => (
                    <div key={index} className="border rounded p-3 bg-gray-50">
                      <div className="flex items-start gap-2 mb-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem(index, "title", e.target.value)}
                          placeholder="Item title (e.g., Verify isolation)"
                          className="flex-1 px-3 py-2 border rounded bg-white"
                        />
                        {newItems.length > 1 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => removeItem(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="Optional description"
                        className="w-full px-3 py-2 border rounded bg-white mb-2"
                      />
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={item.isRequired}
                          onChange={(e) => updateItem(index, "isRequired", e.target.checked)}
                          className="mr-2"
                        />
                        Required (blocks job completion)
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? "Creating..." : "Create Template"}
                </Button>
                <Button variant="secondary" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : selectedTemplate ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedTemplate.title}</CardTitle>
                  {selectedTemplate.description && (
                    <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={selectedTemplate.isActive ? "secondary" : "default"}
                  onClick={() => toggleActive(selectedTemplate)}
                >
                  {selectedTemplate.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <div>Version: {selectedTemplate.version}</div>
                  <div>Created: {new Date(selectedTemplate.createdAt).toLocaleDateString()}</div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Checklist Items ({selectedTemplate.items.length})</h3>
                  <div className="space-y-2">
                    {selectedTemplate.items.map((item, index) => (
                      <div key={item.id || index} className="border rounded p-3 bg-gray-50">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-1">
                            {item.isRequired ? (
                              <Check className="w-4 h-4 text-red-500" />
                            ) : (
                              <Check className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{item.title}</div>
                            {item.description && (
                              <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {item.isRequired ? "Required" : "Optional"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState title="Select a template to view details" />
        )}
      </div>
    </div>
  );
}
