"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CheckoutButton({ plan }: { plan: "solo" | "team" | "pro" }) {
  const [busy, setBusy] = useState(false);

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Checkout failed";
  }

  async function go() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error ?? "Checkout failed");
      if (d?.url) window.location.href = d.url;
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={go} disabled={busy}>
      {busy ? "Redirecting…" : "Checkout " + plan.toUpperCase()}
    </Button>
  );
}

export function PortalButton() {
  const [busy, setBusy] = useState(false);
  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Portal failed";
  }
  async function go() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/billing/portal", { method: "POST" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error ?? "Portal failed");
      if (d?.url) window.location.href = d.url;
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="secondary" onClick={go} disabled={busy}>
      {busy ? "Opening…" : "Manage in Stripe"}
    </Button>
  );
}
