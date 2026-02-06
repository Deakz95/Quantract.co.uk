"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type PlanType = "core" | "pro" | "pro_plus";
type ModuleId = "crm" | "certificates" | "portal" | "tools";
type AddOnItem = {
  type: "extra_user" | "extra_entity" | "extra_storage";
  quantity: number;
};

export function CheckoutButton({
  plan,
  modules = [],
  addOns = [],
  label,
  variant = "default",
}: {
  plan: PlanType;
  modules?: ModuleId[];
  addOns?: AddOnItem[];
  label?: string;
  variant?: "default" | "secondary" | "outline";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planLabels: Record<PlanType, string> = {
    core: "Core",
    pro: "Pro",
    pro_plus: "Pro Plus",
  };

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, modules, addOns }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(d?.error ?? "Checkout failed");
      }
      if (d?.url) window.location.href = d.url;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Checkout failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button variant={variant} onClick={go} disabled={busy} className="w-full">
        {busy ? "Redirecting…" : label || `Subscribe to ${planLabels[plan]}`}
      </Button>
      {error && (
        <p className="text-xs text-[var(--destructive)] mt-1">{error}</p>
      )}
    </div>
  );
}

export function PortalButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/billing/portal", { method: "POST" });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(d?.error ?? "Portal failed");
      }
      if (d?.url) window.location.href = d.url;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Portal failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button variant="secondary" onClick={go} disabled={busy}>
        {busy ? "Opening…" : "Manage in Stripe"}
      </Button>
      {error && (
        <p className="text-xs text-[var(--destructive)] mt-1">{error}</p>
      )}
    </div>
  );
}
