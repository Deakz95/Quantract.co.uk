"use client";

import { useEffect, useState } from "react";

export type BillingStatus = {
  plan?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: string | null;
  trialEnd?: string | null;
};

export function useBillingStatus() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch("/api/admin/billing/status", { cache: "no-store" });
        if (!r.ok) {
          if (active) setStatus(null);
          return;
        }
        const payload = (await r.json().catch(() => null)) as BillingStatus | null;
        if (active) setStatus(payload);
      } catch {
        if (active) setStatus(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return { status, loading };
}
