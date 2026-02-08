"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import {
  canReview,
  getReviewRecord,
  type ReviewHistoryEntry,
} from "@quantract/shared/certificate-types";
import type { Role } from "@/components/AppShell";

type Props = {
  certificateId: string;
  certType: string;
  data: Record<string, unknown>;
  userRole: Role;
  capabilities?: string[];
  onReviewComplete: () => void;
};

export function CertificateReviewPanel({
  certificateId,
  certType,
  data,
  userRole,
  capabilities,
  onReviewComplete,
}: Props) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);

  const record = getReviewRecord(data);
  const reviewCheck = canReview(
    certType as Parameters<typeof canReview>[0],
    data,
    userRole as Parameters<typeof canReview>[2],
    capabilities,
  );

  // Only render when the user can actually review
  if (!reviewCheck.allowed) return null;

  const history = record.reviewHistory || [];

  async function handleReview(action: "approve" | "reject") {
    if (action === "reject" && !notes.trim()) {
      toast({ title: "Notes required", description: "Please provide feedback when requesting changes.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/certificates/${certificateId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Review action failed");
      }
      toast({
        title: action === "approve" ? "Certificate approved" : "Changes requested",
        description: action === "approve"
          ? "The certificate can now be completed."
          : "The engineer will be notified of the required changes.",
      });
      setNotes("");
      setConfirmAction(null);
      onReviewComplete();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Review action failed";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="p-4">
        <h3 className="text-base font-semibold">Certificate Review</h3>

        {/* History timeline */}
        {history.length > 0 && (
          <div className="mt-3 space-y-2">
            {history.map((entry: ReviewHistoryEntry, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                {entry.action === "submitted" && <Clock className="mt-0.5 h-3 w-3 text-[var(--warning)]" />}
                {entry.action === "approved" && <CheckCircle className="mt-0.5 h-3 w-3 text-[var(--success)]" />}
                {entry.action === "rejected" && <XCircle className="mt-0.5 h-3 w-3 text-[var(--destructive)]" />}
                <span>
                  <span className="font-medium">{entry.by}</span>{" "}
                  {entry.action === "submitted" ? "submitted for review" : entry.action}
                  {" "}on {new Date(entry.atISO).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {entry.notes ? ` — "${entry.notes}"` : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Review form */}
        <div className="mt-4 space-y-3">
          <textarea
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            rows={3}
            placeholder="Review notes (required when requesting changes)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
          />
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="bg-[var(--success)] text-white hover:bg-[var(--success)]/90"
              onClick={() => setConfirmAction("approve")}
              disabled={busy}
            >
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (!notes.trim()) {
                  toast({ title: "Notes required", description: "Please provide feedback when requesting changes.", variant: "destructive" });
                  return;
                }
                setConfirmAction("reject");
              }}
              disabled={busy}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Request Changes
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmAction === "approve"}
        title="Approve Certificate"
        message="Are you sure you want to approve this certificate? The engineer will be able to complete it after approval."
        confirmLabel="Approve"
        confirmVariant="default"
        onConfirm={() => handleReview("approve")}
        onCancel={() => setConfirmAction(null)}
        busy={busy}
      />

      <ConfirmDialog
        open={confirmAction === "reject"}
        title="Request Changes"
        message="Are you sure you want to send this certificate back for changes? The engineer will see your feedback."
        confirmLabel="Request Changes"
        confirmVariant="destructive"
        onConfirm={() => handleReview("reject")}
        onCancel={() => setConfirmAction(null)}
        busy={busy}
      />
    </>
  );
}
