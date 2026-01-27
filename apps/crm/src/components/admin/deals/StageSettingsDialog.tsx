"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage, requireOk } from "@/lib/apiClient";
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";

type DealStage = {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  probability: number | null;
  isWon: boolean;
  isLost: boolean;
};

type StageSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

const defaultColors = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#6b7280", // gray
];

export default function StageSettingsDialog({ open, onOpenChange, onSuccess }: StageSettingsDialogProps) {
  const { toast } = useToast();

  const [stages, setStages] = useState<DealStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingStage, setEditingStage] = useState<DealStage | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    color: "#3b82f6",
    probability: "",
    isWon: false,
    isLost: false,
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    color: "#3b82f6",
    probability: "",
    isWon: false,
    isLost: false,
  });

  // Load stages when dialog opens
  useEffect(() => {
    if (!open) return;

    const loadStages = async () => {
      setLoading(true);
      try {
        const res = await apiRequest<{ ok: boolean; stages?: DealStage[]; error?: string }>(
          "/api/admin/deals/stages",
          { cache: "no-store" }
        );

        if (res.ok && res.stages) {
          setStages(res.stages.sort((a, b) => a.sortOrder - b.sortOrder));
        }
      } catch (error) {
        toast({ title: getApiErrorMessage(error, "Failed to load stages"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadStages();
  }, [open, toast]);

  const handleAddStage = useCallback(async () => {
    if (!addForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: addForm.name.trim(),
        color: addForm.color,
        probability: addForm.probability ? parseInt(addForm.probability, 10) : null,
        isWon: addForm.isWon,
        isLost: addForm.isLost,
        sortOrder: stages.length,
      };

      const res = await apiRequest<{ ok: boolean; stage?: DealStage; error?: string }>(
        "/api/admin/deals/stages",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      requireOk(res, "Failed to create stage");

      if (res.stage) {
        setStages((prev) => [...prev, res.stage!]);
      }

      setAddForm({
        name: "",
        color: "#3b82f6",
        probability: "",
        isWon: false,
        isLost: false,
      });
      setShowAddForm(false);
      toast({ title: "Stage created", variant: "success" });
    } catch (error) {
      toast({ title: getApiErrorMessage(error, "Failed to create stage"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [addForm, stages.length, toast]);

  const handleEditStage = useCallback((stage: DealStage) => {
    setEditingStage(stage);
    setEditForm({
      name: stage.name,
      color: stage.color || "#3b82f6",
      probability: stage.probability?.toString() || "",
      isWon: stage.isWon,
      isLost: stage.isLost,
    });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingStage) return;
    if (!editForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        color: editForm.color,
        probability: editForm.probability ? parseInt(editForm.probability, 10) : null,
        isWon: editForm.isWon,
        isLost: editForm.isLost,
      };

      const res = await apiRequest<{ ok: boolean; error?: string }>(
        `/api/admin/deals/stages/${editingStage.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      requireOk(res, "Failed to update stage");

      setStages((prev) =>
        prev.map((s) =>
          s.id === editingStage.id
            ? { ...s, ...payload }
            : s
        )
      );

      setEditingStage(null);
      toast({ title: "Stage updated", variant: "success" });
    } catch (error) {
      toast({ title: getApiErrorMessage(error, "Failed to update stage"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [editingStage, editForm, toast]);

  const handleDeleteStage = useCallback(async (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;

    if (!confirm(`Delete "${stage.name}"? Deals in this stage will need to be reassigned.`)) {
      return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<{ ok: boolean; error?: string }>(
        `/api/admin/deals/stages/${stageId}`,
        { method: "DELETE" }
      );

      requireOk(res, "Failed to delete stage");

      setStages((prev) => prev.filter((s) => s.id !== stageId));
      toast({ title: "Stage deleted", variant: "success" });
    } catch (error) {
      toast({ title: getApiErrorMessage(error, "Failed to delete stage"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [stages, toast]);

  const handleMoveStage = useCallback(async (stageId: string, direction: "up" | "down") => {
    const index = stages.findIndex((s) => s.id === stageId);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === stages.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newStages = [...stages];
    const [removed] = newStages.splice(index, 1);
    newStages.splice(newIndex, 0, removed);

    // Update sortOrder
    const updatedStages = newStages.map((s, i) => ({ ...s, sortOrder: i }));
    setStages(updatedStages);

    // Save to API
    try {
      const res = await apiRequest<{ ok: boolean; error?: string }>(
        "/api/admin/deals/stages/reorder",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            stages: updatedStages.map((s) => ({ id: s.id, sortOrder: s.sortOrder })),
          }),
        }
      );

      requireOk(res, "Failed to reorder stages");
    } catch (error) {
      // Revert on error
      setStages(stages);
      toast({ title: getApiErrorMessage(error, "Failed to reorder stages"), variant: "destructive" });
    }
  }, [stages, toast]);

  const handleClose = useCallback(() => {
    setEditingStage(null);
    setShowAddForm(false);
    onOpenChange(false);
    onSuccess();
  }, [onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pipeline Stages</DialogTitle>
          <DialogDescription>Manage the stages in your sales pipeline</DialogDescription>
        </DialogHeader>

        <DialogBody>
          {loading ? (
            <div className="text-sm text-[var(--muted-foreground)] text-center py-8">Loading stages...</div>
          ) : (
            <div className="space-y-4">
              {/* Existing Stages */}
              {stages.length === 0 ? (
                <div className="text-sm text-[var(--muted-foreground)] text-center py-8 border-2 border-dashed border-[var(--border)] rounded-xl">
                  No stages yet. Add your first stage below.
                </div>
              ) : (
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-xl bg-[var(--background)]"
                    >
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoveStage(stage.id, "up")}
                          disabled={index === 0 || saving}
                          className="p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveStage(stage.id, "down")}
                          disabled={index === stages.length - 1 || saving}
                          className="p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Color Indicator */}
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color || "#6b7280" }}
                      />

                      {/* Stage Info */}
                      <div className="flex-1 min-w-0">
                        {editingStage?.id === stage.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                              placeholder="Stage name"
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm text-[var(--foreground)]"
                            />
                            <div className="flex items-center gap-2">
                              <select
                                value={editForm.color}
                                onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))}
                                className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm text-[var(--foreground)]"
                              >
                                {defaultColors.map((color) => (
                                  <option key={color} value={color}>
                                    {color}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={editForm.probability}
                                onChange={(e) => setEditForm((p) => ({ ...p, probability: e.target.value }))}
                                placeholder="Prob %"
                                className="w-20 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm text-[var(--foreground)]"
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                                <input
                                  type="checkbox"
                                  checked={editForm.isWon}
                                  onChange={(e) => setEditForm((p) => ({ ...p, isWon: e.target.checked, isLost: false }))}
                                />
                                Won stage
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                                <input
                                  type="checkbox"
                                  checked={editForm.isLost}
                                  onChange={(e) => setEditForm((p) => ({ ...p, isLost: e.target.checked, isWon: false }))}
                                />
                                Lost stage
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                                Save
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => setEditingStage(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-sm text-[var(--foreground)]">
                              {stage.name}
                              {stage.isWon && (
                                <span className="ml-2 text-xs text-green-600">(Won)</span>
                              )}
                              {stage.isLost && (
                                <span className="ml-2 text-xs text-red-600">(Lost)</span>
                              )}
                            </div>
                            {stage.probability != null && (
                              <div className="text-xs text-[var(--muted-foreground)]">
                                {stage.probability}% probability
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      {editingStage?.id !== stage.id && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditStage(stage)}
                            disabled={saving}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteStage(stage.id)}
                            disabled={saving}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Stage Form */}
              {showAddForm ? (
                <div className="p-4 border border-[var(--primary)] rounded-xl bg-[var(--primary)]/5">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                        Stage Name *
                      </label>
                      <input
                        type="text"
                        value={addForm.name}
                        onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g., Qualified, Proposal, Negotiation"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                          Color
                        </label>
                        <select
                          value={addForm.color}
                          onChange={(e) => setAddForm((p) => ({ ...p, color: e.target.value }))}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                        >
                          {defaultColors.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                          Probability (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={addForm.probability}
                          onChange={(e) => setAddForm((p) => ({ ...p, probability: e.target.value }))}
                          placeholder="50"
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <input
                          type="checkbox"
                          checked={addForm.isWon}
                          onChange={(e) => setAddForm((p) => ({ ...p, isWon: e.target.checked, isLost: false }))}
                        />
                        Mark as Won stage
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                        <input
                          type="checkbox"
                          checked={addForm.isLost}
                          onChange={(e) => setAddForm((p) => ({ ...p, isLost: e.target.checked, isWon: false }))}
                        />
                        Mark as Lost stage
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button onClick={handleAddStage} disabled={saving}>
                        {saving ? "Adding..." : "Add Stage"}
                      </Button>
                      <Button variant="secondary" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setShowAddForm(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Stage
                </Button>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
