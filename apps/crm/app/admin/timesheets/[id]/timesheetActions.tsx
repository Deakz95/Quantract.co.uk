"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/useToast";

export function TimesheetActions({ id, status }: { id: string; status: string }) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return String(error);
  }

  async function approve() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/timesheets/${id}/approve`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to approve");
      toast({ title: "Approved", variant: "success" });
      window.location.reload();
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/timesheets/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to reject");
      toast({ title: "Rejected", variant: "success" });
      window.location.reload();
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoading(false);
      setConfirmReject(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" onClick={approve} disabled={loading || status === "approved"}>
        Approve
      </Button>
      <div className="flex items-center gap-2">
        <Input value={reason} onChange={(event: ChangeEvent<HTMLInputElement>) => setReason(event.target.value)} placeholder="Reject reason" />
        <Button type="button" variant="secondary" onClick={() => setConfirmReject(true)} disabled={loading || status === "approved"}>
          Reject
        </Button>
      </div>
      <ConfirmDialog
        open={confirmReject}
        title="Reject timesheet?"
        description="The engineer will need to resubmit after updating this timesheet."
        confirmLabel="Reject timesheet"
        onCancel={() => setConfirmReject(false)}
        onConfirm={reject}
        busy={loading}
      />
    </div>
  );
}
