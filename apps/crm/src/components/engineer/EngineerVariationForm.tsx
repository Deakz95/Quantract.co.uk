"use client";

import { useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";

type Stage = {
  id: string;
  name: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

export default function EngineerVariationForm({ jobId, stages }: { jobId: string; stages: Stage[] }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [stageId, setStageId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      toast({ title: "Missing title", description: "Add a short title for the variation.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      if (notes.trim()) form.set("notes", notes.trim());
      if (stageId) form.set("stageId", stageId);
      files.forEach((file) => form.append("photos", file));

      const res = await fetch(`/api/engineer/jobs/${jobId}/variations`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to submit variation");

      setTitle("");
      setNotes("");
      setStageId("");
      setFiles([]);
      setFileKey((k) => k + 1);
      toast({ title: "Variation raised", description: "Sent to admin for review.", variant: "success" });
    } catch (error: unknown) {
      toast({ title: "Could not raise variation", description: getErrorMessage(error, "Unknown error"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raise a variation</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Title</span>
              <input
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Additional consumer unit"
                disabled={busy}
              />
            </label>
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Notes</span>
              <textarea
                className="min-h-[110px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain the change, context, or client request."
                disabled={busy}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Stage (optional)</span>
              <select
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                disabled={busy}
              >
                <option value="">Unassigned</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Photos</span>
              <input
                key={fileKey}
                type="file"
                accept="image/*"
                multiple
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                disabled={busy}
              />
            </label>
          </div>
          {files.length ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
              <div className="font-semibold text-[var(--muted-foreground)]">Selected photos</div>
              <ul className="mt-2 list-disc pl-5">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-[var(--muted-foreground)]">Photos and notes help admin approve and price the variation quickly.</div>
            <Button type="submit" disabled={busy}>Submit variation</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
