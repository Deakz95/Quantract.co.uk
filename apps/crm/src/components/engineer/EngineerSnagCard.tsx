"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const NEXT_STATUS: Record<SnagItem["status"], SnagItem["status"]> = {
  open: "in_progress",
  in_progress: "resolved",
  resolved: "open",
};

const STATUS_LABELS: Record<SnagItem["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

function StatusCircle({ status, disabled, onClick }: { status: SnagItem["status"]; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="shrink-0 flex items-center justify-center w-[44px] h-[44px] rounded-lg hover:bg-[var(--muted)] transition-colors"
      aria-label={`Status: ${STATUS_LABELS[status]}. Tap to change.`}
    >
      <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{
        borderColor: status === "resolved" ? "#22c55e" : status === "in_progress" ? "#f59e0b" : "var(--border)",
        backgroundColor: status === "resolved" ? "#22c55e" : "transparent",
      }}>
        {status === "resolved" && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
        {status === "in_progress" && (
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        )}
      </span>
    </button>
  );
}

export default function EngineerSnagCard({ jobId }: { jobId: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<SnagItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
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
      setShowDesc(false);
      toast({ title: "Snag logged", variant: "success" });
    } catch (error: any) {
      toast({ title: "Could not log snag", description: error?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function cycleStatus(item: SnagItem) {
    const nextStatus = NEXT_STATUS[item.status];
    setUpdatingId(item.id);
    try {
      const res = await fetch(`/api/engineer/snag-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to update");
      setItems((prev) => prev.map((i) => (i.id === item.id ? data.snagItem : i)));
    } catch (error: any) {
      toast({ title: "Could not update snag", description: error?.message || "Unknown error", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  const openItems = items.filter((i) => i.status !== "resolved");
  const resolvedItems = items.filter((i) => i.status === "resolved");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Snag list</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inline add */}
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm min-h-[44px]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !showDesc) submit(); }}
            placeholder="Add a snag..."
            disabled={busy}
          />
          {!showDesc && (
            <button
              type="button"
              onClick={() => setShowDesc(true)}
              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors min-h-[44px] px-2"
              title="Add details"
            >
              +details
            </button>
          )}
          <Button type="button" onClick={submit} disabled={busy} className="min-h-[44px] min-w-[44px]">
            +
          </Button>
        </div>
        {showDesc && (
          <textarea
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Location, materials needed, etc."
            disabled={busy}
          />
        )}

        {/* Open / in-progress items */}
        {openItems.length === 0 && resolvedItems.length === 0 && (
          <div className="text-sm text-[var(--muted-foreground)]">No snag items yet.</div>
        )}
        <div className="space-y-1">
          {openItems.map((item) => (
            <div key={item.id} className="flex items-start gap-1 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2">
              <StatusCircle
                status={item.status}
                disabled={updatingId === item.id}
                onClick={() => cycleStatus(item)}
              />
              <div className="flex-1 min-w-0 py-2">
                <div className="text-sm font-semibold text-[var(--foreground)]">{item.title}</div>
                {item.description && (
                  <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{item.description}</div>
                )}
                <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  {STATUS_LABELS[item.status]} \u2022 {new Date(item.createdAtISO).toLocaleDateString("en-GB")}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resolved items (collapsed) */}
        {resolvedItems.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowResolved(!showResolved)}
              className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors min-h-[44px] inline-flex items-center"
            >
              {showResolved ? "Hide" : "Show"} {resolvedItems.length} resolved
            </button>
            {showResolved && (
              <div className="space-y-1 mt-1">
                {resolvedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2 opacity-60">
                    <StatusCircle
                      status={item.status}
                      disabled={updatingId === item.id}
                      onClick={() => cycleStatus(item)}
                    />
                    <div className="flex-1 min-w-0 py-1">
                      <div className="text-sm text-[var(--foreground)] line-through">{item.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
