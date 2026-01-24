"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/useToast";

type SnagItem = {
  id: string;
  jobId: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "resolved";
  resolvedAtISO?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

const STATUS_LABELS: Record<SnagItem["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export default function EngineerSnagCard({ jobId }: { jobId: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<SnagItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/engineer/jobs/${jobId}/snag-items`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load");
      setItems(Array.isArray(data.snagItems) ? data.snagItems : []);
    } catch (error: any) {
      toast({ title: "Could not load snag items", description: error?.message || "Unknown error", variant: "destructive" });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function submit() {
    if (!title.trim()) {
      toast({ title: "Missing title", description: "Add a short snag title.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/engineer/jobs/${jobId}/snag-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create");
      setItems((prev) => [data.snagItem, ...prev]);
      setTitle("");
      setDescription("");
      toast({ title: "Snag logged", description: "Admin can now triage this issue.", variant: "success" });
    } catch (error: any) {
      toast({ title: "Could not log snag", description: error?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: string, status: SnagItem["status"]) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/engineer/snag-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to update");
      setItems((prev) => prev.map((item) => (item.id === id ? data.snagItem : item)));
    } catch (error: any) {
      toast({ title: "Could not update snag", description: error?.message || "Unknown error", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Snag list</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700">Title</span>
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Damaged faceplate"
              disabled={busy}
            />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700">Details</span>
            <textarea
              className="min-h-[100px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add location, photos requested, or materials needed."
              disabled={busy}
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
            <div className="text-xs text-slate-600">Log snags as soon as you find them so the office can order parts.</div>
            <Button type="button" onClick={submit} disabled={busy}>Add snag</Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-slate-600">No snag items yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    {item.description ? <div className="mt-1 text-xs text-slate-600">{item.description}</div> : null}
                    <div className="mt-2 text-xs text-slate-500">Logged {new Date(item.createdAtISO).toLocaleString("en-GB")}</div>
                  </div>
                  <Badge>{STATUS_LABELS[item.status]}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Update status
                    <select
                      className="ml-2 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs"
                      value={item.status}
                      disabled={updatingId === item.id}
                      onChange={(event) => updateStatus(item.id, event.target.value as SnagItem["status"])}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  {item.resolvedAtISO ? (
                    <span className="text-xs text-slate-500">Resolved {new Date(item.resolvedAtISO).toLocaleString("en-GB")}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
